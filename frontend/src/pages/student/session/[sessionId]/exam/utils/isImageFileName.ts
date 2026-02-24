// 이미지 파일명 판별
export const isImageFileName = (name: string): boolean =>
  /\.(png|jpe?g|gif|webp|bmp|tiff?)$/i.test(name);
