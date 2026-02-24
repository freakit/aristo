import { fetchExamAttachmentMap } from "./fetchExamAttachmentMap";

// section.attachments에 file 메타를 주입
export const hydrateExamAttachments = async (examData: any): Promise<any> => {
  const examId = examData?.id ?? examData?.examId;
  if (!examId) return examData;

  const fileMap = await fetchExamAttachmentMap(examId);
  const sections = (examData.sections ?? []) as any[];

  const newSections = sections.map((sec: any) => {
    const fileIds: number[] =
      (sec.attachmentFileIds as number[]) ??
      (sec.attachments ?? [])
        .map((a: any) => Number(a.fileId))
        .filter(Boolean) ??
      [];

    const baseAtts =
      Array.isArray(sec.attachments) && sec.attachments.length > 0
        ? sec.attachments
        : fileIds.map((fid: number, i: number) => ({
            id: `${sec.id ?? "sec"}-att-${i}`,
            fileId: fid,
          }));

    const hydrated = baseAtts.map((a: any, i: number) => {
      const fid = Number(a.fileId);
      const meta = fileMap.get(fid);
      return {
        ...a,
        id: a.id ?? `${sec.id ?? "sec"}-att-${i}`,
        file: meta,
      };
    });

    return { ...sec, attachments: hydrated };
  });

  return { ...examData, sections: newSections };
};
