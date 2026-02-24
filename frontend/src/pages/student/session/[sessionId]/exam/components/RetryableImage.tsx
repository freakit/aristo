import React, { useState, useEffect } from "react";
import styled from "styled-components";

const Image = styled.img`
  width: 100%;
  height: auto;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
`;

interface RetryableImageProps {
  src: string;
  alt: string;
  onClick?: () => void;
}

export const RetryableImage: React.FC<RetryableImageProps> = ({
  src,
  alt,
  onClick,
}) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setImgSrc(src);
    setError(false);
    setRetryCount(0);
  }, [src]);

  const handleError = () => {
    if (retryCount === 0) {
      // 1-1. Auto Retry (Immediate)
      console.log("🔄 [Auto Retry] Retrying image load...", src);
      const separator = src.includes("?") ? "&" : "?";
      setImgSrc(`${src}${separator}retry=${Date.now()}`);
      setRetryCount(1);
    } else {
      // 1-2. Manual Retry (Show Error UI)
      setError(true);
    }
  };

  const handleManualRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("👆 [Manual Retry] User requested retry...", src);
    setError(false);
    const separator = src.includes("?") ? "&" : "?";
    setImgSrc(`${src}${separator}manual_retry=${Date.now()}`);
  };

  if (error) {
    return (
      <div
        onClick={handleManualRetry}
        style={{
          width: "100%",
          height: "200px", // Fixed height for error state
          borderRadius: "8px",
          border: "1px dashed #ef4444",
          background: "#fee2e2",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#dc2626",
          fontSize: "14px",
          gap: "8px",
        }}
      >
        <div style={{ fontSize: "24px" }}>⚠️</div>
        <div style={{ fontWeight: 600 }}>Image Load Failed</div>
        <div style={{ fontSize: "12px", textDecoration: "underline" }}>
          Tap to Retry
        </div>
      </div>
    );
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      style={{ cursor: "zoom-in" }}
      onError={handleError}
      onClick={onClick}
    />
  );
};
