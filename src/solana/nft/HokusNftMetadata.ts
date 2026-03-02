export type HokusNftMetadata = {
  mintAddress?: string;
  name: string;
  description: string;
  imageUri?: string;
  attributes: Record<string, string>;
  audioScriptUri?: string;
};
