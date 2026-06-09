declare module "mammoth/mammoth.browser" {
  const mammoth: {
    convertToHtml(
      input: { arrayBuffer: ArrayBuffer },
      options?: any
    ): Promise<{ value: string; messages: any[] }>;
  };
  export default mammoth;
}
