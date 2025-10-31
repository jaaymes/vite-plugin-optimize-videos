import type { Plugin } from "vite";

import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import ffprobePath from "@ffprobe-installer/ffprobe";
import { readdir, readFile, stat, unlink, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

ffmpeg.setFfmpegPath(ffmpegPath.path);
ffmpeg.setFfprobePath(ffprobePath.path);

export type VideoExtension = ".mp4" | ".webm" | ".mov" | ".avi";

interface VideoFormatOptions {
  quality?: number;
  preset?: string;
}

interface OptimizeVideosOptions {
  exclude?: (VideoExtension | string)[];
  quality?: number;
  preset?: string;
  ".mp4"?: VideoFormatOptions;
  ".webm"?: VideoFormatOptions;
  ".mov"?: VideoFormatOptions;
  ".avi"?: VideoFormatOptions;
}

const VIDEO_EXTENSIONS: VideoExtension[] = [".mp4", ".webm", ".mov", ".avi"];

const getVideoOptions = (
  ext: string,
  options: OptimizeVideosOptions
): { quality: number; preset: string } => {
  const lower = ext.toLowerCase() as keyof OptimizeVideosOptions;
  const formatOptions = options[lower] as VideoFormatOptions | undefined;
  return {
    quality: formatOptions?.quality ?? options.quality ?? 18,
    preset: formatOptions?.preset ?? options.preset ?? "medium",
  };
};

const isVideoFile = (
  fileName: string,
  exclude: (VideoExtension | string)[] = []
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
  exclude: (VideoExtension | string)[] = []
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
  opts: { quality: number; preset: string }
) => {
  const lower = ext.toLowerCase();
  if (lower === ".mp4") {
    return {
      codec: "libx264",
      format: "mp4",
      options: [
        "-crf",
        String(opts.quality),
        "-preset",
        opts.preset,
        "-profile:v",
        "high",
        "-level",
        "4.0",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-y",
      ],
    } as const;
  }
  if (lower === ".webm") {
    const cpuUsed =
      opts.preset === "slow" ? "0" : opts.preset === "medium" ? "2" : "4";
    return {
      codec: "libvpx-vp9",
      format: "webm",
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
    return {
      codec: "libx264",
      format: "mov",
      options: [
        "-crf",
        String(opts.quality),
        "-preset",
        opts.preset,
        "-pix_fmt",
        "yuv420p",
        "-y",
      ],
    } as const;
  }
  return {
    codec: "libx264",
    format: "avi",
    options: [
      "-crf",
      String(opts.quality),
      "-preset",
      opts.preset,
      "-pix_fmt",
      "yuv420p",
      "-y",
    ],
  } as const;
};

const optimizeVideo = async (
  inputPath: string,
  outputPath: string,
  options: { quality: number; preset: string }
): Promise<{ originalSize: number; optimizedSize: number }> => {
  const originalSize = (await stat(inputPath)).size;
  const ext = path.extname(inputPath).toLowerCase();
  const cfg = getFormatConfig(ext, options);
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec(cfg.codec)
      .noAudio()
      .format(cfg.format)
      .outputOptions(cfg.options as unknown as string[])
      .output(outputPath)
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
  const { exclude = [] } = options;
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

      console.log("\n🎬 " + "\x1b[1m" + "Video Optimization" + "\x1b[0m");
      console.log(
        "\x1b[36m" +
          `   Found ${videoFiles.length} video file(s) to optimize` +
          "\x1b[0m\n"
      );

      for (const videoFile of videoFiles) {
        const fileName = path.basename(videoFile);
        const ext = path.extname(videoFile).toLowerCase();
        const tempOutputPath = `${videoFile}.tmp${ext}`;
        try {
          console.log(
            "\x1b[33m" +
              `⚡ Optimizing: ` +
              "\x1b[0m" +
              `\x1b[1m${fileName}\x1b[0m`
          );
          const videoOptions = getVideoOptions(ext, options);
          const { originalSize, optimizedSize } = await optimizeVideo(
            videoFile,
            tempOutputPath,
            videoOptions
          );
          const reduction = ((1 - optimizedSize / originalSize) * 100).toFixed(
            1
          );
          const originalMB = (originalSize / 1024 / 1024).toFixed(2);
          const optimizedMB = (optimizedSize / 1024 / 1024).toFixed(2);
          console.log(
            "\x1b[32m" +
              `✅ ${fileName}\n` +
              "\x1b[0m" +
              `   ${originalMB} MB → ${optimizedMB} MB ` +
              "\x1b[32m" +
              `(${reduction}% smaller)` +
              "\x1b[0m\n"
          );
          await unlink(videoFile);
          await writeFile(videoFile, await readFile(tempOutputPath));
          await unlink(tempOutputPath);
        } catch (error) {
          console.error(
            "\x1b[31m" +
              `❌ Error optimizing ${fileName}:\n` +
              "\x1b[0m" +
              `   ${error instanceof Error ? error.message : String(error)}\n`
          );
          if (existsSync(tempOutputPath)) {
            await unlink(tempOutputPath);
          }
        }
      }
      console.log(
        "\x1b[32m" + "🎉 Video optimization completed!" + "\x1b[0m\n"
      );
    },
  };
};

export default optimizeVideos;
