import type { Plugin } from "vite";

import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import ffprobePath from "@ffprobe-installer/ffprobe";
import { readdir, readFile, stat, unlink, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import pc from "picocolors";

ffmpeg.setFfmpegPath(ffmpegPath.path);
ffmpeg.setFfprobePath(ffprobePath.path);

export type VideoExtension = ".mp4" | ".webm" | ".mov" | ".avi";

interface VideoFormatOptions {
  quality?: number;
  preset?: string;
  mute?: boolean;
}

interface OptimizeVideosOptions {
  exclude?: (VideoExtension | string)[];
  quality?: number;
  preset?: string;
  mute?: boolean;
  concurrency?: number;
  ".mp4"?: VideoFormatOptions;
  ".webm"?: VideoFormatOptions;
  ".mov"?: VideoFormatOptions;
  ".avi"?: VideoFormatOptions;
}

const VIDEO_EXTENSIONS: VideoExtension[] = [".mp4", ".webm", ".mov", ".avi"];

const getVideoOptions = (
  ext: string,
  options: OptimizeVideosOptions,
): { quality: number; preset: string; mute: boolean } => {
  const lower = ext.toLowerCase() as keyof OptimizeVideosOptions;
  const formatOptions = options[lower] as VideoFormatOptions | undefined;
  return {
    quality: formatOptions?.quality ?? options.quality ?? 18,
    preset: formatOptions?.preset ?? options.preset ?? "medium",
    mute: formatOptions?.mute ?? options.mute ?? false,
  };
};

const isVideoFile = (
  fileName: string,
  exclude: (VideoExtension | string)[] = [],
): boolean => {
  const ext = path.extname(fileName).toLowerCase();
  if (!VIDEO_EXTENSIONS.includes(ext as VideoExtension)) {
    return false;
  }
  return !exclude.some((pattern) => {
    if (pattern.startsWith(".")) {
      return ext === pattern;
    }
    return fileName.includes(pattern);
  });
};

const findVideoFiles = async (
  dir: string,
  exclude: (VideoExtension | string)[] = [],
): Promise<string[]> => {
  const videoFiles: string[] = [];
  const scanDirectory = async (currentDir: string): Promise<void> => {
    if (!existsSync(currentDir)) {
      return;
    }
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await scanDirectory(fullPath);
      } else if (entry.isFile() && isVideoFile(entry.name, exclude)) {
        videoFiles.push(fullPath);
      }
    }
  };
  await scanDirectory(dir);
  return videoFiles;
};

const getFormatConfig = (
  ext: string,
  opts: { quality: number; preset: string; mute: boolean },
) => {
  const lower = ext.toLowerCase();
  const optionsCommon = [
    "-crf",
    String(opts.quality),
    "-preset",
    opts.preset,
    "-pix_fmt",
    "yuv420p",
    "-y", // Overwrite output files
  ];

  if (opts.mute) {
    // Only mute if explicitly requested
    // No explicit audio codec needed if we are stripping audio, but removing -an
    // lets fluent-ffmpeg handle logic if we were retaining it.
    // However, logic below calls .noAudio() conditionally.
  }

  // Codec selection
  let codec = "libx264";
  let format = "mp4";

  if (lower === ".webm") {
    codec = "libvpx-vp9";
    format = "webm";
    // WebM specific
    const cpuUsed =
      opts.preset === "slow" ? "0" : opts.preset === "medium" ? "2" : "4";
    return {
      codec,
      format,
      options: [
        "-crf",
        String(opts.quality),
        "-b:v",
        "0",
        "-pix_fmt",
        "yuv420p",
        "-cpu-used",
        cpuUsed,
        "-y",
      ],
    } as const;
  }

  if (lower === ".mov") {
    format = "mov";
  } else if (lower === ".avi") {
    format = "avi";
  } else {
    // mp4
    optionsCommon.push(
      "-profile:v",
      "high",
      "-level",
      "4.0",
      "-movflags",
      "+faststart",
    );
  }

  return {
    codec,
    format,
    options: optionsCommon,
  } as const;
};

const optimizeVideo = async (
  inputPath: string,
  outputPath: string,
  options: { quality: number; preset: string; mute: boolean },
): Promise<{ originalSize: number; optimizedSize: number }> => {
  const originalSize = (await stat(inputPath)).size;
  const ext = path.extname(inputPath).toLowerCase();
  const cfg = getFormatConfig(ext, options);

  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath)
      .videoCodec(cfg.codec)
      .format(cfg.format)
      .outputOptions(cfg.options as unknown as string[])
      .output(outputPath);

    if (options.mute) {
      command = command.noAudio();
    }

    command
      .on("end", async () => {
        try {
          const optimizedSize = (await stat(outputPath)).size;
          resolve({ optimizedSize, originalSize });
        } catch (error) {
          reject(error);
        }
      })
      .on("error", reject)
      .run();
  });
};

export const optimizeVideos = (options: OptimizeVideosOptions = {}): Plugin => {
  const { exclude = [], concurrency = 4 } = options;
  let distDir: string;

  return {
    name: "vite-plugin-optimize-videos",
    apply: "build",
    configResolved(config) {
      distDir = path.resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      if (!distDir || !existsSync(distDir)) {
        return;
      }
      const videoFiles = await findVideoFiles(distDir, exclude);
      if (videoFiles.length === 0) {
        return;
      }

      console.log(pc.bold("\n🎬 Video Optimization"));
      console.log(
        pc.cyan(`   Found ${videoFiles.length} video file(s) to optimize\n`),
      );

      // Parallel processing with limiting
      const processFile = async (videoFile: string) => {
        const fileName = path.basename(videoFile);
        const ext = path.extname(videoFile).toLowerCase();
        const tempOutputPath = `${videoFile}.tmp${ext}`;

        try {
          console.log(pc.yellow(`⚡ Optimizing: `) + pc.bold(fileName));
          const videoOptions = getVideoOptions(ext, options);

          const { originalSize, optimizedSize } = await optimizeVideo(
            videoFile,
            tempOutputPath,
            videoOptions,
          );

          const reduction = ((1 - optimizedSize / originalSize) * 100).toFixed(
            1,
          );
          const originalMB = (originalSize / 1024 / 1024).toFixed(2);
          const optimizedMB = (optimizedSize / 1024 / 1024).toFixed(2);

          console.log(
            pc.green(`✅ ${fileName}\n`) +
              `   ${originalMB} MB → ${optimizedMB} MB ` +
              pc.green(`(${reduction}% smaller)\n`),
          );

          await unlink(videoFile);
          await writeFile(videoFile, await readFile(tempOutputPath));
          await unlink(tempOutputPath);
        } catch (error) {
          console.error(
            pc.red(`❌ Error optimizing ${fileName}:\n`) +
              `   ${error instanceof Error ? error.message : String(error)}\n`,
          );
          if (existsSync(tempOutputPath)) {
            await unlink(tempOutputPath);
          }
        }
      };

      // Chunk execution based on concurrency
      const chunks = [];
      for (let i = 0; i < videoFiles.length; i += concurrency) {
        chunks.push(videoFiles.slice(i, i + concurrency));
      }

      for (const chunk of chunks) {
        await Promise.all(chunk.map((file) => processFile(file)));
      }

      console.log(pc.green("🎉 Video optimization completed!\n"));
    },
  };
};

export default optimizeVideos;
