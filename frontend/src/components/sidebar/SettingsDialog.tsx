import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useThemeStore } from "@/stores/useThemeStore";
import { Bell, Moon, Shield, Sparkles, Sun, Volume2 } from "lucide-react";
import { useState } from "react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const { isDark, toggleTheme } = useThemeStore();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [desktopNotif, setDesktopNotif] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [activeStatus, setActiveStatus] = useState(true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-[#181B24] border-[#262B35] text-slate-100 p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 border-b border-[#262B35]">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2 text-white">
            <Sparkles className="size-5 text-indigo-400" />
            Cài đặt ứng dụng Hungo
          </DialogTitle>
        </DialogHeader>

        <div className="p-5 pt-2">
          <Tabs defaultValue="appearance" className="w-full">
            <TabsList className="grid grid-cols-3 bg-[#1F2430] border border-[#2B3245] p-1 rounded-xl mb-5">
              <TabsTrigger
                value="appearance"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white rounded-lg text-xs font-medium"
              >
                Giao diện
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white rounded-lg text-xs font-medium"
              >
                Thông báo
              </TabsTrigger>
              <TabsTrigger
                value="privacy"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white rounded-lg text-xs font-medium"
              >
                Riêng tư
              </TabsTrigger>
            </TabsList>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#1F2430]/70 border border-[#2B3245]">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium text-slate-200 flex items-center gap-2">
                    {isDark ? <Moon className="size-4 text-indigo-400" /> : <Sun className="size-4 text-amber-400" />}
                    Chế độ tối (Dark Mode)
                  </Label>
                  <p className="text-xs text-slate-400">
                    Giao diện dark mode hiện đại, bảo vệ mắt khi làm việc
                  </p>
                </div>
                <Switch checked={isDark} onCheckedChange={toggleTheme} />
              </div>

              <div className="p-3.5 rounded-xl bg-[#1F2430]/70 border border-[#2B3245] space-y-2">
                <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Màu chủ đạo (Accent Color)
                </Label>
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-medium shadow-sm">
                    <span className="size-2.5 rounded-full bg-white animate-pulse" />
                    Indigo - Violet (Mặc định)
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#1F2430]/70 border border-[#2B3245]">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium text-slate-200 flex items-center gap-2">
                    <Bell className="size-4 text-indigo-400" />
                    Thông báo đẩy trên màn hình
                  </Label>
                  <p className="text-xs text-slate-400">
                    Hiển thị thông báo khi có tin nhắn hoặc cuộc gọi mới
                  </p>
                </div>
                <Switch checked={desktopNotif} onCheckedChange={setDesktopNotif} />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#1F2430]/70 border border-[#2B3245]">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium text-slate-200 flex items-center gap-2">
                    <Volume2 className="size-4 text-indigo-400" />
                    Âm thanh thông báo
                  </Label>
                  <p className="text-xs text-slate-400">
                    Phát chuông khi gửi/nhận tin nhắn hoặc có cuộc gọi đến
                  </p>
                </div>
                <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
              </div>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#1F2430]/70 border border-[#2B3245]">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium text-slate-200 flex items-center gap-2">
                    <Shield className="size-4 text-indigo-400" />
                    Hiển thị trạng thái "Đang hoạt động"
                  </Label>
                  <p className="text-xs text-slate-400">
                    Cho phép bạn bè biết khi bạn đang online
                  </p>
                </div>
                <Switch checked={activeStatus} onCheckedChange={setActiveStatus} />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#1F2430]/70 border border-[#2B3245]">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium text-slate-200">
                    Đã xem tin nhắn (Read Receipts)
                  </Label>
                  <p className="text-xs text-slate-400">
                    Hiển thị trạng thái "Đã xem" cho người gửi khi bạn đọc tin
                  </p>
                </div>
                <Switch checked={readReceipts} onCheckedChange={setReadReceipts} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
