import { create } from "zustand";
import type { Socket } from "socket.io-client";

type CallStatus = "idle" | "calling" | "incoming" | "connecting" | "connected";
export type CallType = "audio" | "video";

interface VideoCallState {
  status: CallStatus;
  callId: string | null;
  conversationId: string | null;
  peerUserId: string | null;
  peerName: string;
  callType: CallType;
  offer: RTCSessionDescriptionInit | null;
  peerConnection: RTCPeerConnection | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  muted: boolean;
  cameraOff: boolean;
  socket: Socket | null;
  pendingCandidates: RTCIceCandidateInit[];
  pendingLocalCandidates: RTCIceCandidateInit[];
  signalReady: boolean;
  registerSocket: (socket: Socket) => void;
  startCall: (
    conversationId: string,
    peerUserId: string,
    peerName: string,
    callType?: CallType
  ) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleMuted: () => void;
  toggleCamera: () => void;
  reset: () => void;
}

const idleState = {
  status: "idle" as const,
  callId: null,
  conversationId: null,
  peerUserId: null,
  peerName: "",
  callType: "video" as CallType,
  offer: null,
  peerConnection: null,
  localStream: null,
  remoteStream: null,
  muted: false,
  cameraOff: false,
  pendingCandidates: [],
  pendingLocalCandidates: [],
  signalReady: false,
};

const stopStreams = (localStream: MediaStream | null, remoteStream: MediaStream | null) => {
  localStream?.getTracks().forEach((track) => track.stop());
  remoteStream?.getTracks().forEach((track) => track.stop());
};

export const useVideoCallStore = create<VideoCallState>((set, get) => {
  const cleanCall = (notifyPeer: boolean) => {
    const { callId, socket, peerConnection, localStream, remoteStream } = get();
    if (notifyPeer && callId) socket?.emit("call:end", { callId });
    peerConnection?.close();
    stopStreams(localStream, remoteStream);
    set(idleState);
  };

  const createPeerConnection = (
    socket: Socket,
    callId: string,
    stream: MediaStream
  ) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const candidate = event.candidate.toJSON();
        if (get().signalReady) {
          socket.emit("call:ice-candidate", { callId, candidate });
        } else {
          set((state) => ({
            pendingLocalCandidates: [...state.pendingLocalCandidates, candidate],
          }));
        }
      }
    };
    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0];
      if (remoteStream) set({ remoteStream });
    };
    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === "connected") {
        set({ status: "connected" });
      } else if (peerConnection.connectionState === "failed") {
        cleanCall(true);
      }
    };

    set({ peerConnection, localStream: stream });
    return peerConnection;
  };

  const addPendingCandidates = async (peerConnection: RTCPeerConnection) => {
    const candidates = get().pendingCandidates;
    set({ pendingCandidates: [] });
    for (const candidate of candidates) {
      await peerConnection.addIceCandidate(candidate);
    }
  };

  const waitForSocketConnection = async (socket: Socket) => {
    if (socket.connected) return;
    if (socket.disconnected) socket.connect();

    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        socket.off("connect", onConnect);
        socket.off("connect_error", onError);
        reject(new Error("Không thể kết nối máy chủ cuộc gọi"));
      }, 30_000);

      const onConnect = () => {
        window.clearTimeout(timeout);
        socket.off("connect_error", onError);
        resolve();
      };
      const onError = () => {
        window.clearTimeout(timeout);
        socket.off("connect", onConnect);
        reject(new Error("Không thể kết nối máy chủ cuộc gọi"));
      };

      socket.once("connect", onConnect);
      socket.once("connect_error", onError);
    });
  };

  const emitCallAck = (
    socket: Socket,
    event: "call:invite" | "call:answer",
    payload: Record<string, unknown>
  ) =>
    new Promise<{ ok: boolean; message?: string }>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        reject(new Error("Máy chủ cuộc gọi không phản hồi"));
      }, 30_000);
      socket.emit(event, payload, (result: { ok: boolean; message?: string }) => {
        window.clearTimeout(timeout);
        resolve(result);
      });
    });

  const registerSocket = (socket: Socket) => {
    set({ socket });
    socket.on("call:incoming", ({ callId, conversationId, callerId, callerName, offer, callType }) => {
      if (get().status !== "idle") {
        socket.emit("call:decline", { callId });
        return;
      }
      set({
        status: "incoming",
        callId,
        conversationId,
        peerUserId: callerId,
        peerName: callerName,
        offer,
        callType: callType === "audio" ? "audio" : "video",
      });
    });

    socket.on("call:accepted", async ({ callId, answer }) => {
      const { callId: currentCallId, peerConnection } = get();
      if (callId !== currentCallId || !peerConnection) return;
      try {
        await peerConnection.setRemoteDescription(answer);
        await addPendingCandidates(peerConnection);
        set({ status: "connecting" });
      } catch (error) {
        console.error("Không thể thiết lập kết nối video", error);
        cleanCall(true);
      }
    });

    socket.on("call:ice-candidate", async ({ callId, candidate }) => {
      const { callId: currentCallId, peerConnection } = get();
      if (callId !== currentCallId) return;
      if (!peerConnection?.remoteDescription) {
        set((state) => ({
          pendingCandidates: [...state.pendingCandidates, candidate],
        }));
        return;
      }
      try {
        await peerConnection.addIceCandidate(candidate);
      } catch (error) {
        console.error("Không thể nhận candidate video", error);
      }
    });

    socket.on("call:declined", () => cleanCall(false));
    socket.on("call:ended", () => cleanCall(false));
  };

  return {
    ...idleState,
    socket: null,
    registerSocket,
    startCall: async (conversationId, peerUserId, peerName, callType = "video") => {
      if (get().status !== "idle") return;
      const socket = get().socket;
      if (!socket) throw new Error("Chưa kết nối máy chủ");
      await waitForSocketConnection(socket);

      const callId = crypto.randomUUID();
      set({ status: "calling", callId, conversationId, peerUserId, peerName, callType });

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === "video",
        });
        const peerConnection = createPeerConnection(socket, callId, stream);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        const result = await emitCallAck(socket, "call:invite", {
          callId,
          conversationId,
          targetUserId: peerUserId,
          offer,
          callType,
        });
        if (!result.ok) {
          throw new Error(result.message || "Không thể gọi người dùng này");
        }
        const pendingLocalCandidates = get().pendingLocalCandidates;
        set({ signalReady: true, pendingLocalCandidates: [] });
        pendingLocalCandidates.forEach((candidate) => {
          socket.emit("call:ice-candidate", { callId, candidate });
        });
      } catch (error) {
        cleanCall(false);
        throw error;
      }
    },
    acceptCall: async () => {
      const { callId, offer, socket, callType } = get();
      if (!callId || !offer || !socket) return;

      try {
        await waitForSocketConnection(socket);
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === "video",
        });
        const peerConnection = createPeerConnection(socket, callId, stream);
        await peerConnection.setRemoteDescription(offer);
        await addPendingCandidates(peerConnection);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        const result = await emitCallAck(socket, "call:answer", { callId, answer });
        if (!result.ok) throw new Error(result.message || "Không thể nhận cuộc gọi");
        const pendingLocalCandidates = get().pendingLocalCandidates;
        set({ status: "connecting", signalReady: true, pendingLocalCandidates: [] });
        pendingLocalCandidates.forEach((candidate) => {
          socket.emit("call:ice-candidate", { callId, candidate });
        });
      } catch (error) {
        cleanCall(true);
        throw error;
      }
    },
    declineCall: () => {
      const { callId, socket } = get();
      if (callId) socket?.emit("call:decline", { callId });
      cleanCall(false);
    },
    endCall: () => cleanCall(true),
    toggleMuted: () => {
      const muted = !get().muted;
      get().localStream?.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
      set({ muted });
    },
    toggleCamera: () => {
      const cameraOff = !get().cameraOff;
      get().localStream?.getVideoTracks().forEach((track) => {
        track.enabled = !cameraOff;
      });
      set({ cameraOff });
    },
    reset: () => cleanCall(false),
  };
});
