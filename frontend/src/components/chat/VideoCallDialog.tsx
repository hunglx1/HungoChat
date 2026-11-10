import { useEffect, useRef } from "react";
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
} from "lucide-react";
import { toast } from "sonner";
import { useVideoCallStore } from "@/stores/useVideoCallStore";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

const VideoCallDialog = () => {
  const {
    status,
    peerName,
    localStream,
    remoteStream,
    muted,
    cameraOff,
    acceptCall,
    declineCall,
    endCall,
    toggleMuted,
    toggleCamera,
  } = useVideoCallStore();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const isOpen = status !== "idle";

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  const handleAccept = async () => {
    try {
      await acceptCall();
    } catch (error) {
      console.error("Không thể nhận cuộc gọi video", error);
      toast.error(
        error instanceof Error ? error.message : "Không thể truy cập camera hoặc microphone"
      );
    }
  };

  const statusText = {
    idle: "",
    calling: "Đang gọi...",
    incoming: "Cuộc gọi đến",
    connecting: "Đang kết nối...",
    connected: "Đang trong cuộc gọi",
  }[status];

  return (
    <Dialog open={isOpen}>
      <DialogContent
        showCloseButton={false}
        className="w-[min(900px,calc(100%-2rem))] max-w-none overflow-hidden border-0 bg-slate-950 p-0 text-white"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Cuộc gọi video</DialogTitle>
          <DialogDescription>{statusText} {peerName}</DialogDescription>
        </DialogHeader>

        <div className="relative flex aspect-video items-center justify-center bg-slate-900">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-full w-full object-contain"
          />
          {!remoteStream && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
              <PhoneOutgoing className="size-10 text-slate-300" />
              <p className="text-lg font-medium">{statusText}</p>
              <p className="text-sm text-slate-300">{peerName}</p>
            </div>
          )}
          {localStream && (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="absolute bottom-4 right-4 aspect-video w-1/4 rounded-lg border border-white/30 bg-slate-800 object-cover"
            />
          )}
        </div>

        <div className="flex items-center justify-center gap-3 p-4">
          {status === "incoming" ? (
            <>
              <Button
                variant="destructive"
                size="icon-lg"
                className="rounded-full"
                onClick={declineCall}
                aria-label="Từ chối cuộc gọi"
              >
                <Phone className="size-5 rotate-[135deg]" />
              </Button>
              <Button
                size="icon-lg"
                className="rounded-full bg-green-600 hover:bg-green-700"
                onClick={handleAccept}
                aria-label="Nhận cuộc gọi"
              >
                <PhoneIncoming className="size-5" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant={muted ? "destructive" : "secondary"}
                size="icon-lg"
                className="rounded-full"
                onClick={toggleMuted}
                disabled={!localStream}
                aria-label={muted ? "Bật microphone" : "Tắt microphone"}
              >
                {muted ? <MicOff /> : <Mic />}
              </Button>
              <Button
                variant="destructive"
                size="icon-lg"
                className="rounded-full"
                onClick={endCall}
                aria-label="Kết thúc cuộc gọi"
              >
                <Phone className="size-5 rotate-[135deg]" />
              </Button>
              <Button
                variant={cameraOff ? "destructive" : "secondary"}
                size="icon-lg"
                className="rounded-full"
                onClick={toggleCamera}
                disabled={!localStream}
                aria-label={cameraOff ? "Bật camera" : "Tắt camera"}
              >
                {cameraOff ? <CameraOff /> : <Camera />}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoCallDialog;
