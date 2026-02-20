"use client";

/**
 * LEDGER — Card Scan Page
 *
 * Mobile-first 4-stage flow:
 *   1. Capture  — Camera or Upload tab
 *   2. Analyzing — Blurred preview + spinner while AI identifies the card
 *   3. Result   — Grade estimate, condition grid, confidence bar, "Add to Vault"
 *   4. Confirmed — Success state with link to Portfolio
 */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Camera,
  Upload,
  CheckCircle,
  RotateCcw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { colors, layout } from "@/lib/theme";
import { type VaultHolding } from "@/lib/vault-data";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

type Stage = "capture" | "analyzing" | "result" | "confirmed";
type CaptureTab = "camera" | "upload";

interface ConditionDetail {
  corners: string;
  surfaces: string;
  centering: string;
  edges: string;
}

interface ScanResult {
  name: string;
  set: string;
  year: number;
  cardNumber: string | null;
  category: string;
  estimatedGrade: number;
  gradeRange: [number, number];
  confidence: number;
  condition: ConditionDetail;
  notes: string;
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function gradeColor(grade: number): string {
  if (grade >= 10) return colors.green;
  if (grade >= 9) return "#F5C842";
  if (grade >= 8) return colors.textSecondary;
  return colors.red;
}

function conditionDot(value: string): string {
  const v = value.toLowerCase();
  if (v.includes("sharp") || v.includes("clean") || v.includes("well")) return colors.green;
  if (v.includes("slightly") || v.includes("light")) return "#F5C842";
  if (v.includes("heavily") || v.includes("severe")) return colors.red;
  return "#F5C842";
}

function confidenceLabel(c: number): { label: string; color: string } {
  if (c >= 0.85) return { label: "High confidence", color: colors.green };
  if (c >= 0.6) return { label: "Medium confidence", color: "#F5C842" };
  return { label: "Low confidence — review carefully", color: colors.red };
}

/** Resize a canvas snapshot to a small thumbnail data URL for localStorage. */
function makeThumb(canvas: HTMLCanvasElement): string {
  const thumb = document.createElement("canvas");
  const aspect = canvas.height / canvas.width;
  thumb.width = 60;
  thumb.height = Math.round(60 * aspect);
  thumb.getContext("2d")?.drawImage(canvas, 0, 0, thumb.width, thumb.height);
  return thumb.toDataURL("image/jpeg", 0.6);
}

// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────

export default function ScanPage() {
  const [stage, setStage] = useState<Stage>("capture");
  const [captureTab, setCaptureTab] = useState<CaptureTab>("camera");

  // Image state
  const [blobUrl, setBlobUrl] = useState<string | null>(null);       // for display
  const [imageBase64, setImageBase64] = useState<string | null>(null); // for API
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  const [thumbDataUrl, setThumbDataUrl] = useState<string | null>(null); // for storage

  // AI result
  const [result, setResult] = useState<ScanResult | null>(null);
  const [matchedSymbol, setMatchedSymbol] = useState<string | null>(null);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Camera management ──────────────────────────────────
  useEffect(() => {
    if (stage === "capture" && captureTab === "camera" && !blobUrl) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "environment" } })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch(() => setCameraError("Camera access denied or unavailable"));
    } else {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [stage, captureTab, blobUrl]);

  // ── Capture from camera ────────────────────────────────
  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    const thumb = makeThumb(canvas);
    setThumbDataUrl(thumb);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);

        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          setImageBase64(dataUrl.split(",")[1]);
          setMimeType("image/jpeg");
        };
        reader.readAsDataURL(blob);

        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      },
      "image/jpeg",
      0.88
    );
  }

  // ── Handle file upload ─────────────────────────────────
  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setBlobUrl(url);
    setMimeType(file.type.startsWith("image/png") ? "image/png" : "image/jpeg");

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      setImageBase64(base64);

      // Build thumb from the image
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext("2d")?.drawImage(img, 0, 0);
        setThumbDataUrl(makeThumb(canvas));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  // ── Analyze card ───────────────────────────────────────
  async function analyzeCard() {
    if (!imageBase64) return;
    setError(null);
    setStage("analyzing");

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Analysis failed");
        setStage("capture");
        return;
      }

      setResult(data.card);
      setMatchedSymbol(data.matchedSymbol ?? null);
      setStage("result");
    } catch {
      setError("Network error — please try again");
      setStage("capture");
    }
  }

  // ── Add to vault ───────────────────────────────────────
  function addToVault() {
    if (!result) return;

    const newHolding: VaultHolding = {
      id: `scan-${Date.now()}`,
      name: result.name ?? "Unknown Card",
      symbol: matchedSymbol ?? `SCAN-${Date.now()}`,
      grade: Math.round(result.estimatedGrade ?? 9),
      set: result.set ?? "Unknown Set",
      year: result.year ?? new Date().getFullYear(),
      acquisitionPrice: 0,
      status: "in_transit",
      dateDeposited: new Date().toISOString().split("T")[0],
      certNumber: "Pending grading",
      imageUrl: thumbDataUrl ?? "",
    };

    try {
      const existing: VaultHolding[] = JSON.parse(
        localStorage.getItem("ledger-scanned-cards") ?? "[]"
      );
      localStorage.setItem(
        "ledger-scanned-cards",
        JSON.stringify([...existing, newHolding])
      );
    } catch {
      // localStorage unavailable — proceed anyway
    }

    setStage("confirmed");
  }

  // ── Reset to scan again ────────────────────────────────
  function reset() {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    setImageBase64(null);
    setThumbDataUrl(null);
    setResult(null);
    setMatchedSymbol(null);
    setError(null);
    setCameraError(null);
    setStage("capture");
  }

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────

  const pageStyle: React.CSSProperties = {
    minHeight: `calc(100dvh - ${layout.chromeHeight})`,
    background: colors.background,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  };

  const cardStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 480,
    padding: "0 16px 40px",
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* ── Stage 1: Capture ── */}
        {stage === "capture" && (
          <CaptureStage
            captureTab={captureTab}
            setCaptureTab={(tab) => {
              setCaptureTab(tab);
              setCameraError(null);
              setBlobUrl(null);
              setImageBase64(null);
            }}
            blobUrl={blobUrl}
            error={error}
            cameraError={cameraError}
            dragOver={dragOver}
            videoRef={videoRef}
            fileInputRef={fileInputRef}
            onCapture={capturePhoto}
            onFile={handleFile}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onRetake={() => { if (blobUrl) URL.revokeObjectURL(blobUrl); setBlobUrl(null); setImageBase64(null); setCameraError(null); }}
            onSwitchToUpload={() => { setCaptureTab("upload"); setCameraError(null); }}
            onAnalyze={analyzeCard}
            canAnalyze={!!imageBase64}
          />
        )}

        {/* ── Stage 2: Analyzing ── */}
        {stage === "analyzing" && blobUrl && (
          <AnalyzingStage blobUrl={blobUrl} />
        )}

        {/* ── Stage 3: Result ── */}
        {stage === "result" && result && (
          <ResultStage
            result={result}
            thumbDataUrl={thumbDataUrl}
            matchedSymbol={matchedSymbol}
            onAddToVault={addToVault}
            onScanAgain={reset}
          />
        )}

        {/* ── Stage 4: Confirmed ── */}
        {stage === "confirmed" && result && (
          <ConfirmedStage cardName={result.name} onScanAgain={reset} />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Stage 1 — Capture
// ─────────────────────────────────────────────────────────

interface CaptureStageProps {
  captureTab: CaptureTab;
  setCaptureTab: (t: CaptureTab) => void;
  blobUrl: string | null;
  error: string | null;
  cameraError: string | null;
  dragOver: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onCapture: () => void;
  onFile: (f: File) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onRetake: () => void;
  onSwitchToUpload: () => void;
  onAnalyze: () => void;
  canAnalyze: boolean;
}

function CaptureStage({
  captureTab,
  setCaptureTab,
  blobUrl,
  error,
  cameraError,
  dragOver,
  videoRef,
  fileInputRef,
  onCapture,
  onFile,
  onDragOver,
  onDragLeave,
  onDrop,
  onRetake,
  onSwitchToUpload,
  onAnalyze,
  canAnalyze,
}: CaptureStageProps) {
  return (
    <>
      {/* Header */}
      <div style={{ paddingTop: 32, paddingBottom: 20 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: colors.textPrimary,
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          Scan a Card
        </h1>
        <p style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
          Photograph your card — AI identifies it instantly
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(255,59,48,0.1)",
            border: `1px solid ${colors.red}44`,
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 16,
          }}
        >
          <AlertCircle size={14} style={{ color: colors.red, flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: colors.red }}>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 16,
          background: colors.surface,
          borderRadius: 10,
          padding: 4,
        }}
      >
        {(["camera", "upload"] as CaptureTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setCaptureTab(tab)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              border: "none",
              transition: "all 0.15s",
              background: captureTab === tab ? colors.background : "transparent",
              color: captureTab === tab ? colors.textPrimary : colors.textMuted,
              boxShadow: captureTab === tab ? "0 1px 4px rgba(0,0,0,0.4)" : "none",
            }}
          >
            {tab === "camera" ? (
              <Camera size={14} strokeWidth={2} />
            ) : (
              <Upload size={14} strokeWidth={2} />
            )}
            {tab === "camera" ? "Camera" : "Upload"}
          </button>
        ))}
      </div>

      {/* Camera tab */}
      {captureTab === "camera" && (
        <>
          {blobUrl ? (
            <CapturedPreview blobUrl={blobUrl} onRetake={onRetake} />
          ) : cameraError ? (
            <div
              style={{
                textAlign: "center",
                padding: "32px 16px",
                background: colors.surface,
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
              }}
            >
              <p style={{ fontSize: 13, color: colors.red, marginBottom: 12 }}>
                {cameraError}
              </p>
              <button
                onClick={onSwitchToUpload}
                style={{
                  fontSize: 13,
                  color: colors.green,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Use Upload instead →
              </button>
            </div>
          ) : (
            <div
              style={{
                position: "relative",
                borderRadius: 12,
                overflow: "hidden",
                background: "#000",
                aspectRatio: "3/4",
              }}
            >
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              {/* Corner guides */}
              {(["tl", "tr", "bl", "br"] as const).map((pos) => (
                <div
                  key={pos}
                  style={{
                    position: "absolute",
                    width: 28,
                    height: 28,
                    borderColor: colors.green,
                    borderStyle: "solid",
                    borderWidth: 0,
                    ...(pos === "tl" && { top: 16, left: 16, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 5 }),
                    ...(pos === "tr" && { top: 16, right: 16, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 5 }),
                    ...(pos === "bl" && { bottom: 16, left: 16, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 5 }),
                    ...(pos === "br" && { bottom: 16, right: 16, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 5 }),
                  }}
                />
              ))}
              {/* Capture button */}
              <div
                style={{
                  position: "absolute",
                  bottom: 20,
                  left: 0,
                  right: 0,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <button
                  onClick={onCapture}
                  aria-label="Capture card photo"
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: colors.green,
                    border: "4px solid rgba(255,255,255,0.9)",
                    cursor: "pointer",
                    boxShadow: `0 0 24px rgba(0,200,5,0.6)`,
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Upload tab */}
      {captureTab === "upload" && (
        <>
          {blobUrl ? (
            <CapturedPreview blobUrl={blobUrl} onRetake={onRetake} />
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              style={{
                border: `2px dashed ${dragOver ? colors.green : colors.border}`,
                borderRadius: 12,
                padding: "48px 24px",
                textAlign: "center",
                cursor: "pointer",
                background: dragOver ? colors.greenMuted : "transparent",
                transition: "all 0.15s",
              }}
            >
              <Upload
                size={28}
                style={{ color: colors.textMuted, margin: "0 auto 12px", display: "block" }}
              />
              <p style={{ fontSize: 14, color: colors.textSecondary, margin: 0 }}>
                Drag photo here or{" "}
                <span style={{ color: colors.green }}>browse files</span>
              </p>
              <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }}>
                JPG, PNG, HEIC — any size
              </p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </>
      )}

      {/* Analyze button */}
      <button
        onClick={onAnalyze}
        disabled={!canAnalyze}
        style={{
          width: "100%",
          marginTop: 20,
          padding: "14px 0",
          borderRadius: 12,
          fontSize: 15,
          fontWeight: 700,
          cursor: canAnalyze ? "pointer" : "not-allowed",
          border: "none",
          background: canAnalyze ? colors.green : colors.surface,
          color: canAnalyze ? colors.textInverse : colors.textMuted,
          transition: "all 0.15s",
        }}
      >
        Analyze Card →
      </button>
    </>
  );
}

function CapturedPreview({
  blobUrl,
  onRetake,
}: {
  blobUrl: string;
  onRetake: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div
        style={{
          width: 80,
          height: 112,
          borderRadius: 8,
          overflow: "hidden",
          border: `1px solid ${colors.border}`,
          flexShrink: 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={blobUrl}
          alt="Captured card"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: colors.green, margin: 0 }}>
          Photo ready
        </p>
        <p style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
          Tap Analyze Card below, or retake
        </p>
        <button
          onClick={onRetake}
          style={{
            marginTop: 8,
            fontSize: 12,
            color: colors.textMuted,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <RotateCcw size={11} /> Retake
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Stage 2 — Analyzing
// ─────────────────────────────────────────────────────────

function AnalyzingStage({ blobUrl }: { blobUrl: string }) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        marginTop: 0,
        borderRadius: 16,
        overflow: "hidden",
        aspectRatio: "3/4",
      }}
    >
      {/* Blurred card image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={blobUrl}
        alt="Analyzing"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "blur(8px) brightness(0.4)",
          transform: "scale(1.05)",
        }}
      />

      {/* Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <Loader2
          size={40}
          style={{
            color: colors.green,
            animation: "spin 1s linear infinite",
          }}
        />
        <p
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#fff",
            textAlign: "center",
            margin: 0,
          }}
        >
          Identifying your card with AI…
        </p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", margin: 0 }}>
          This takes a few seconds
        </p>
      </div>

      {/* CSS for spinner */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Stage 3 — Result
// ─────────────────────────────────────────────────────────

interface ResultStageProps {
  result: ScanResult;
  thumbDataUrl: string | null;
  matchedSymbol: string | null;
  onAddToVault: () => void;
  onScanAgain: () => void;
}

function ResultStage({
  result,
  thumbDataUrl,
  matchedSymbol,
  onAddToVault,
  onScanAgain,
}: ResultStageProps) {
  const gc = gradeColor(result.estimatedGrade);
  const conf = confidenceLabel(result.confidence);
  const confPct = Math.round(result.confidence * 100);

  const conditionItems: Array<{ label: string; value: string }> = [
    { label: "Corners", value: result.condition?.corners ?? "unknown" },
    { label: "Surfaces", value: result.condition?.surfaces ?? "unknown" },
    { label: "Centering", value: result.condition?.centering ?? "unknown" },
    { label: "Edges", value: result.condition?.edges ?? "unknown" },
  ];

  return (
    <>
      <div style={{ paddingTop: 28, paddingBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.textMuted, margin: 0 }}>
          AI Identification Complete
        </p>
      </div>

      {/* Card header */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 20,
          padding: 16,
          background: colors.surface,
          borderRadius: 12,
          border: `1px solid ${colors.border}`,
        }}
      >
        {/* Thumbnail */}
        {thumbDataUrl ? (
          <div
            style={{
              width: 60,
              height: 84,
              borderRadius: 6,
              overflow: "hidden",
              border: `1px solid ${colors.border}`,
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbDataUrl}
              alt={result.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        ) : (
          <div
            style={{
              width: 60,
              height: 84,
              borderRadius: 6,
              background: colors.surfaceOverlay,
              border: `1px solid ${colors.border}`,
              flexShrink: 0,
            }}
          />
        )}

        {/* Identity */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: colors.textPrimary,
                margin: 0,
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              {result.name}
            </h2>
            {/* Grade badge */}
            <div
              style={{
                background: `${gc}18`,
                border: `1px solid ${gc}55`,
                borderRadius: 6,
                padding: "3px 8px",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: gc, letterSpacing: "0.04em" }}>
                PSA {result.estimatedGrade} est.
              </span>
            </div>
          </div>

          <p style={{ fontSize: 12, color: colors.textMuted, margin: "4px 0 0" }}>
            {result.set}
            {result.year ? ` · ${result.year}` : ""}
            {result.cardNumber ? ` · #${result.cardNumber}` : ""}
          </p>

          {/* Grade range */}
          <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }}>
            Grade range estimate:{" "}
            <span style={{ color: gc, fontWeight: 600 }}>
              {result.gradeRange?.[0]}–{result.gradeRange?.[1]}
            </span>
          </p>

          {matchedSymbol && (
            <p style={{ fontSize: 11, color: colors.green, marginTop: 4, fontWeight: 600 }}>
              ✓ Matched to live market listing
            </p>
          )}
        </div>
      </div>

      {/* Condition grid */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.textMuted, marginBottom: 10 }}>
          Condition Assessment
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {conditionItems.map(({ label, value }) => (
            <div
              key={label}
              style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: conditionDot(value),
                  flexShrink: 0,
                }}
              />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: colors.textMuted, margin: 0 }}>
                  {label}
                </p>
                <p style={{ fontSize: 12, fontWeight: 500, color: colors.textPrimary, margin: "2px 0 0", textTransform: "capitalize" }}>
                  {value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confidence bar */}
      <div
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          padding: "12px 14px",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.textMuted, margin: 0 }}>
            AI Confidence
          </p>
          <span style={{ fontSize: 12, fontWeight: 700, color: conf.color }}>
            {confPct}% — {conf.label}
          </span>
        </div>
        <div style={{ height: 6, borderRadius: 99, background: colors.surfaceOverlay }}>
          <div
            style={{
              height: "100%",
              borderRadius: 99,
              background: conf.color,
              width: `${confPct}%`,
              transition: "width 0.6s ease",
            }}
          />
        </div>
      </div>

      {/* Notes */}
      {result.notes && (
        <div
          style={{
            background: colors.surfaceOverlay,
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 20,
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.textMuted, marginBottom: 6 }}>
            Notes
          </p>
          <p style={{ fontSize: 13, color: colors.textSecondary, margin: 0, lineHeight: 1.5 }}>
            {result.notes}
          </p>
        </div>
      )}

      {/* Actions */}
      <button
        onClick={onAddToVault}
        style={{
          width: "100%",
          padding: "14px 0",
          borderRadius: 12,
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          border: "none",
          background: colors.green,
          color: colors.textInverse,
          marginBottom: 12,
        }}
      >
        Add to Vault →
      </button>

      <button
        onClick={onScanAgain}
        style={{
          width: "100%",
          padding: "12px 0",
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          border: `1px solid ${colors.border}`,
          background: "transparent",
          color: colors.textSecondary,
        }}
      >
        Scan Again
      </button>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// Stage 4 — Confirmed
// ─────────────────────────────────────────────────────────

function ConfirmedStage({
  cardName,
  onScanAgain,
}: {
  cardName: string;
  onScanAgain: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        paddingTop: 60,
        gap: 16,
      }}
    >
      <CheckCircle
        size={64}
        strokeWidth={1.5}
        style={{ color: colors.green }}
      />

      <div>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: colors.textPrimary,
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Card Registered
        </h2>
        <p
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            marginTop: 8,
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: colors.textPrimary }}>{cardName}</strong>{" "}
          has been registered as{" "}
          <span
            style={{
              color: "#F5C842",
              fontWeight: 600,
              background: "rgba(245,200,66,0.12)",
              padding: "1px 6px",
              borderRadius: 4,
            }}
          >
            in_transit
          </span>
        </p>
        <p style={{ fontSize: 13, color: colors.textMuted, marginTop: 8 }}>
          Ship your card within 14 days to complete registration
        </p>
      </div>

      <div
        style={{
          background: colors.greenMuted,
          border: `1px solid ${colors.green}44`,
          borderRadius: 12,
          padding: "14px 20px",
          marginTop: 8,
          maxWidth: 340,
        }}
      >
        <p style={{ fontSize: 13, color: colors.green, margin: 0, lineHeight: 1.5 }}>
          Once received, our team will verify condition and update your vault status.
        </p>
      </div>

      <Link
        href="/portfolio"
        style={{
          display: "block",
          width: "100%",
          maxWidth: 340,
          marginTop: 16,
          padding: "14px 0",
          borderRadius: 12,
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          border: "none",
          background: colors.green,
          color: colors.textInverse,
          textDecoration: "none",
          textAlign: "center",
        }}
      >
        View Portfolio →
      </Link>

      <button
        onClick={onScanAgain}
        style={{
          width: "100%",
          maxWidth: 340,
          padding: "12px 0",
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          border: `1px solid ${colors.border}`,
          background: "transparent",
          color: colors.textSecondary,
        }}
      >
        Scan Another Card
      </button>
    </div>
  );
}
