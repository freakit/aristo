import { useState, useEffect } from "react";
import { getAzureSasToken } from "@/common/services/api/getAzureSasToken";
import { Exam } from "@/common/types";

export const useExamMedia = (exam: Exam | null) => {
  const [sasUrls, setSasUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchAllSasUrls = async () => {
      if (!exam?.sections) return;
      
      const allAttachments = exam.sections.flatMap(
        (sec: any) => sec.attachments || []
      );
      const files = allAttachments.map((a: any) => a.file).filter(Boolean);
      
      // 중복 파일 제거
      const uniqueFiles: any[] = Array.from(
        new Map(files.map((f: any) => [f.id, f])).values()
      );
      
      if (uniqueFiles.length === 0) return;

      const entries = await Promise.all(
        uniqueFiles.map(async (f: any) => {
          const res = await getAzureSasToken(f.fileName, {
            folder: "attachments",
          });
          return [f.id, res.data?.sasUrl] as const;
        })
      );

      setSasUrls((prev) => {
        const next = { ...prev };
        for (const [id, url] of entries) {
          if (url) next[id] = url;
        }
        return next;
      });
    };
    
    fetchAllSasUrls();
  }, [exam]);

  const [isUploading, setIsUploading] = useState(false);

  return { sasUrls, setSasUrls, isUploading, setIsUploading };
};
