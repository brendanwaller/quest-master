export interface ComfyAvatarResult {
  url: string;
  prompt: string;
  seed: number;
  status: "comfyui" | "fallback";
  message?: string;
}

export interface GenerateComfyAvatarOptions {
  baseUrl?: string;
  seed?: number;
  width?: number;
  height?: number;
  steps?: number;
  cfg?: number;
}

const DEFAULT_COMFYUI_URL = "http://127.0.0.1:8188";

export function getComfyUiBaseUrl() {
  return import.meta.env.VITE_COMFYUI_URL || DEFAULT_COMFYUI_URL;
}

export async function checkComfyUiAvailable(baseUrl = getComfyUiBaseUrl()) {
  try {
    const response = await fetch(`${baseUrl}/system_stats`, { cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}

export async function generateAvatarWithComfyUi(
  prompt: string,
  options: GenerateComfyAvatarOptions = {},
): Promise<ComfyAvatarResult> {
  const baseUrl = options.baseUrl || getComfyUiBaseUrl();
  const seed = options.seed ?? Math.floor(Math.random() * 1_000_000_000);
  const width = options.width ?? 512;
  const height = options.height ?? 512;
  const steps = options.steps ?? 8;
  const cfg = options.cfg ?? 6;

  const workflow = buildAvatarWorkflow({
    prompt,
    seed,
    width,
    height,
    steps,
    cfg,
    filenamePrefix: `dragon_maister_avatar_${Date.now()}`,
  });

  const promptResponse = await fetch(`${baseUrl}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: workflow,
      client_id: `dungeon-maister-${crypto.randomUUID()}`,
    }),
  });

  if (!promptResponse.ok) {
    const body = await safeResponseText(promptResponse);
    throw new Error(`ComfyUI rejected the avatar request: ${promptResponse.status} ${body}`);
  }

  const submitted = await promptResponse.json() as { prompt_id: string; node_errors?: Record<string, unknown> };
  if (submitted.node_errors && Object.keys(submitted.node_errors).length > 0) {
    throw new Error(`ComfyUI workflow validation failed: ${JSON.stringify(submitted.node_errors)}`);
  }

  const image = await waitForComfyImage(baseUrl, submitted.prompt_id);
  const viewUrl = `${baseUrl}/view?filename=${encodeURIComponent(image.filename)}&subfolder=${encodeURIComponent(image.subfolder || "")}&type=${encodeURIComponent(image.type || "output")}`;
  const imageResponse = await fetch(viewUrl);
  if (!imageResponse.ok) {
    throw new Error(`ComfyUI could not return the generated avatar: ${imageResponse.status}`);
  }

  const blob = await imageResponse.blob();
  const url = await blobToDataUrl(blob);

  return {
    url,
    prompt,
    seed,
    status: "comfyui",
  };
}

interface ComfyImageRef {
  filename: string;
  subfolder?: string;
  type?: string;
}

function buildAvatarWorkflow({
  prompt,
  seed,
  width,
  height,
  steps,
  cfg,
  filenamePrefix,
}: {
  prompt: string;
  seed: number;
  width: number;
  height: number;
  steps: number;
  cfg: number;
  filenamePrefix: string;
}) {
  return {
    "3": {
      class_type: "KSampler",
      inputs: {
        seed,
        steps,
        cfg,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: 1,
        model: ["4", 0],
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["5", 0],
      },
    },
    "4": {
      class_type: "CheckpointLoaderSimple",
      inputs: {
        ckpt_name: "sd_xl_base_1.0.safetensors",
      },
    },
    "5": {
      class_type: "EmptyLatentImage",
      inputs: {
        width,
        height,
        batch_size: 1,
      },
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: prompt,
        clip: ["4", 1],
      },
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: "ugly, blurry, low quality, deformed hands, extra fingers, extra ears, watermark, text, logo, graphic violence, horror, scary, gore, nsfw",
        clip: ["4", 1],
      },
    },
    "8": {
      class_type: "VAEDecode",
      inputs: {
        samples: ["3", 0],
        vae: ["4", 2],
      },
    },
    "9": {
      class_type: "SaveImage",
      inputs: {
        filename_prefix: filenamePrefix,
        images: ["8", 0],
      },
    },
  };
}

async function waitForComfyImage(baseUrl: string, promptId: string): Promise<ComfyImageRef> {
  const startedAt = Date.now();
  const timeoutMs = 5 * 60 * 1000;

  while (Date.now() - startedAt < timeoutMs) {
    const response = await fetch(`${baseUrl}/history/${encodeURIComponent(promptId)}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`ComfyUI history request failed: ${response.status}`);
    }

    const history = await response.json() as Record<string, any>;
    const entry = history[promptId];
    if (!entry) {
      await delay(1000);
      continue;
    }

    const status = entry.status || {};
    if (status.status_str === "error") {
      throw new Error(`ComfyUI generation failed: ${JSON.stringify(entry)}`);
    }

    if (status.completed) {
      const image = entry.outputs?.["9"]?.images?.[0];
      if (!image) {
        throw new Error("ComfyUI finished but no avatar image was returned.");
      }
      return image;
    }

    await delay(1000);
  }

  throw new Error("ComfyUI generation timed out after 5 minutes.");
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("Failed to read generated avatar."));
    reader.readAsDataURL(blob);
  });
}

async function safeResponseText(response: Response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
