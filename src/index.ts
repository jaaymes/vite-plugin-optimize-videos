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
  videoDir?: string;
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
  const { exclude = [], videoDir = "public" } = options;
  let rootDir: string;
  let videoDirectory: string;
  return {
    name: "vite-plugin-optimize-videos",
    apply: "build",
    configResolved(config) {
      rootDir = config.root;
      // Resolve videoDir: se for absoluto, usa direto; senão resolve relativo ao root
      videoDirectory = path.isAbsolute(videoDir)
        ? videoDir
        : path.resolve(rootDir, videoDir);
    },
    async closeBundle() {
      if (!videoDirectory || !existsSync(videoDirectory)) {
        return;
      }
      const videoFiles = await findVideoFiles(videoDirectory, exclude);
      if (videoFiles.length === 0) {
        return;
      }
      console.log(
        `🎬 Encontrados ${videoFiles.length} arquivo(s) de vídeo para otimizar`
      );
      for (const videoFile of videoFiles) {
        const fileName = path.basename(videoFile);
        const ext = path.extname(videoFile).toLowerCase();
        const tempOutputPath = `${videoFile}.tmp${ext}`;
        try {
          console.log(`⚡ Otimizando: ${fileName}`);
          const videoOptions = getVideoOptions(ext, options);
          const { originalSize, optimizedSize } = await optimizeVideo(
            videoFile,
            tempOutputPath,
            videoOptions
          );
          const reduction = ((1 - optimizedSize / originalSize) * 100).toFixed(
            1
          );
          console.log(
            `✅ ${fileName}: ${(originalSize / 1024 / 1024).toFixed(2)} MB → ${(
              optimizedSize /
              1024 /
              1024
            ).toFixed(2)} MB (${reduction}% menor)`
          );
          await unlink(videoFile);
          await writeFile(videoFile, await readFile(tempOutputPath));
          await unlink(tempOutputPath);
        } catch (error) {
          console.error(
            `❌ Erro ao otimizar ${fileName}:`,
            error instanceof Error ? error.message : String(error)
          );
          if (existsSync(tempOutputPath)) {
            await unlink(tempOutputPath);
          }
        }
      }
      console.log("🎉 Otimização de vídeos concluída!");
    },
  };
};

export default optimizeVideos;
