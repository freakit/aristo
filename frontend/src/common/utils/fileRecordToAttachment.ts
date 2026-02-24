import { Attachment, FileRecord } from "@/common/types";

// FileRecord를 Attachment로 변환
export const fileRecordToAttachment = (fr: FileRecord): Attachment => {
  return {
    id: String(fr.id),
    sectionId: 0,
    fileId: Number(fr.id),
    file: {
      id: Number(fr.id),
      fileName: fr.fileName,
      fileUrl: fr.fileUrl,
    },
  };
};
