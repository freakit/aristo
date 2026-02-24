import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getExamById } from "@/common/services/api/getExamById";
import { getStudents } from "@/common/services/teacher/getStudents";
import { getExamSetSession } from "@/common/services/student/getExamSetSession";
import { listBlobs } from "@/common/services/api/listBlobs";
import { getAzureSasToken } from "@/common/services/api/getAzureSasToken";
import { Exam, Student, ExamLog } from "@/common/types";
import { findExamStudentForTeacher } from "@/common/services/teacher/findExamStudentForTeacher";
import { getQAList } from "@/common/services/api/getQAList";
import { downloadReport } from "../downloadReport";
import { QA } from "@/common/types";

export const useExamReviewLogic = () => {
  const { examId, studentId } = useParams<{
    examId: string;
    studentId: string;
  }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<Exam | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [screenVideoUrl, setScreenVideoUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"TRACKING" | "SCREEN">("TRACKING");
  const [examLog, setExamLog] = useState<ExamLog | null>(null);
  const [qaList, setQaList] = useState<QA[]>([]);
  const [error, setError] = useState<string | null>(null);

  const trackingRef = useRef<HTMLVideoElement>(null);
  const screenRef = useRef<HTMLVideoElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [resolvedExamName, setResolvedExamName] = useState<string>("");
  const [debugLog, setDebugLog] = useState<any>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!examId || !studentId) return;

      try {
        setLoading(true);
        const [examData, studentsData] = await Promise.all([
          getExamById(examId),
          getStudents(),
        ]);

        setExam(examData);
        if (!examData) throw new Error("Exam not found");

        const foundStudent = studentsData.find(
          (s) => String(s.id) === String(studentId),
        );
        setStudent(foundStudent || null);

        let targetExamName = examData.name;
        if (examData.examSetId && foundStudent) {
          try {
            const setSession = await getExamSetSession(
              String(examData.examSetId),
              String(foundStudent.studentId),
            );
            if (setSession && setSession.name) {
              targetExamName = setSession.name;
            }
          } catch (e) {
            console.error("Failed to fetch Exam Set session info", e);
          }
        }

        setResolvedExamName(targetExamName);

        const studentIdentifier = foundStudent?.registrationNumber || studentId;

        const [videoBlobsRes, logBlobsRes] = await Promise.all([
          listBlobs("", { folder: "recordings" }),
          listBlobs("", { folder: "gazetrackings" }),
        ]);

        if (videoBlobsRes.success && logBlobsRes.success) {
          const school = foundStudent?.school || "";
          const searchCommon = school
            ? `_${school}_${studentIdentifier}_${targetExamName}_`
            : `_${studentIdentifier}_${targetExamName}_`;

          const trackingSearchPart = searchCommon;
          const validBlobs = videoBlobsRes.data?.blobs || [];

          const trackingVideos = validBlobs.filter(
            (name) =>
              name.includes(trackingSearchPart) &&
              (name.endsWith(".webm") || name.endsWith(".mp4")) &&
              name.includes("tracking_"),
          );

          const screenVideos = validBlobs.filter(
            (name) =>
              name.includes(trackingSearchPart) &&
              (name.endsWith(".webm") || name.endsWith(".mp4")) &&
              name.includes("screen_set_"),
          );

          const logFiles =
            logBlobsRes.data?.blobs.filter(
              (name) =>
                name.includes(trackingSearchPart) && name.endsWith(".json"),
            ) || [];

          setDebugLog({
            studentIdentifier,
            targetExamName,
            school,
            searchCommon,
            totalVideos: validBlobs.length,
            trackingVideos,
            screenVideos,
            matchedLogs: logFiles,
          });

          trackingVideos.sort();
          screenVideos.sort();
          logFiles.sort();

          const latestTrackingVideo = trackingVideos[trackingVideos.length - 1];
          const latestScreenVideo = screenVideos[screenVideos.length - 1];
          const latestLog = logFiles[logFiles.length - 1];

          if (latestTrackingVideo) {
            const sasRes = await getAzureSasToken(latestTrackingVideo, {
              folder: "recordings",
            });
            if (sasRes.success && sasRes.data) {
              setVideoUrl(sasRes.data.sasUrl);
            }
          }

          if (latestScreenVideo) {
            const sasRes = await getAzureSasToken(latestScreenVideo, {
              folder: "recordings",
            });
            if (sasRes.success && sasRes.data) {
              setScreenVideoUrl(sasRes.data.sasUrl);
            }
          }

          if (latestLog) {
            const sasRes = await getAzureSasToken(latestLog, {
              folder: "gazetrackings",
            });
            if (sasRes.success && sasRes.data) {
              const jsonRes = await fetch(sasRes.data.sasUrl);
              const logData = await jsonRes.json();
              setExamLog(logData);
            }
          }

          // Fetch QA List
          if (foundStudent) {
            try {
              const sessionData = await findExamStudentForTeacher(
                examId,
                foundStudent.id,
                { status: "completed" },
              );

              if (sessionData && sessionData.examStudentId) {
                const qaListData = await getQAList(
                  sessionData.examStudentId.toString(),
                );
                setQaList(qaListData);
              }
            } catch (e) {
              console.error("Failed to fetch QA list", e);
            }
          }
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [examId, studentId]);

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (viewMode === "TRACKING" && e.currentTarget === trackingRef.current) {
      setCurrentTime(e.currentTarget.currentTime);
    } else if (viewMode === "SCREEN" && e.currentTarget === screenRef.current) {
      setCurrentTime(e.currentTarget.currentTime);
    }
  };

  const handleEventClick = (timestampMs: number) => {
    const timeSec = timestampMs / 1000;
    if (trackingRef.current) trackingRef.current.currentTime = timeSec;
    if (screenRef.current) screenRef.current.currentTime = timeSec;

    if (viewMode === "TRACKING" && trackingRef.current) {
      trackingRef.current.play();
    } else if (viewMode === "SCREEN" && screenRef.current) {
      screenRef.current.play();
    }
  };

  const switchViewMode = (mode: "TRACKING" | "SCREEN") => {
    if (mode === viewMode) return;

    const currentRef =
      mode === "TRACKING" ? screenRef.current : trackingRef.current;
    const nextRef =
      mode === "TRACKING" ? trackingRef.current : screenRef.current;

    if (currentRef && nextRef) {
      const isPlaying = !currentRef.paused;
      const time = currentRef.currentTime;

      currentRef.pause();

      nextRef.currentTime = time;
      if (isPlaying) {
        nextRef.play().catch((e) => console.log("Play error during switch", e));
      }
    } else if (nextRef) {
      nextRef.currentTime = currentTime;
    }

    setViewMode(mode);
  };

  const handleDownloadReport = async () => {
    if (!reportRef.current || !student) return;

    try {
      await downloadReport(
        reportRef.current,
        student.registrationNumber,
        resolvedExamName || exam?.name || "exam",
      );
    } catch (err) {
      alert("Failed to generate report. Please try again.");
    }
  };

  return {
    exam,
    student,
    examLog,
    videoUrl,
    screenVideoUrl,
    viewMode,
    switchViewMode,
    currentTime,
    handleTimeUpdate,
    handleEventClick,
    handleDownloadReport,
    trackingRef,
    screenRef,
    reportRef,
    resolvedExamName,
    loading,
    error,
    navigate,
    debugLog,
    qaList,
  };
};
