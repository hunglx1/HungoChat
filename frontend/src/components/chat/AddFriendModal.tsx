import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { UserPlus } from "lucide-react";
import type { User } from "@/types/user";
import { useFriendStore } from "@/stores/useFriendStore";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import SearchForm from "@/components/AddFriendModal/SearchForm";
import SendFriendRequestForm from "@/components/AddFriendModal/SendFriendRequestForm";

export interface IFormValues {
  username: string;
  message: string;
}

const AddFriendModal = () => {
  const [isFound, setIsFound] = useState<boolean | null>(null);
  const [searchUser, setSearchUser] = useState<User>();
  const [searchedUsername, setSearchedUsername] = useState("");
  const { loading, searchByUsername, addFriend } = useFriendStore();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<IFormValues>({
    defaultValues: { username: "", message: "" },
  });

  const usernameValue = watch("username");

  const handleSearch = handleSubmit(async (data) => {
    const username = data.username.trim();
    if (!username) return;

    setIsFound(null);
    setSearchedUsername(username);

    try {
      const foundUser = await searchByUsername(username);
      if (foundUser) {
        setIsFound(true);
        setSearchUser(foundUser);
      } else {
        setIsFound(false);
      }
    } catch (error) {
      console.error(error);
      setIsFound(false);
    }
  });

  const handleSend = handleSubmit(async (data) => {
    if (!searchUser) return;

    try {
      const message = await addFriend(searchUser._id, data.message.trim());
      toast.success(message);
      handleCancel();
    } catch (error) {
      console.error("Lỗi xảy ra khi gửi request từ form", error);
    }
  });

  const handleCancel = () => {
    reset();
    setSearchedUsername("");
    setIsFound(null);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="size-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#1F2430] transition-colors cursor-pointer"
          title="Kết bạn mới"
        >
          <UserPlus className="size-4" />
          <span className="sr-only">Kết bạn</span>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px] bg-[#181B24] border-[#262B35] text-slate-100 shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-white text-base font-semibold flex items-center gap-2">
            <UserPlus className="size-5 text-indigo-400" />
            Kết bạn mới
          </DialogTitle>
        </DialogHeader>

        {!isFound && (
          <SearchForm
            register={register}
            errors={errors}
            usernameValue={usernameValue}
            loading={loading}
            isFound={isFound}
            searchedUsername={searchedUsername}
            onSubmit={handleSearch}
            onCancel={handleCancel}
          />
        )}

        {isFound && (
          <SendFriendRequestForm
            register={register}
            loading={loading}
            searchedUsername={searchedUsername}
            onSubmit={handleSend}
            onBack={() => setIsFound(null)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddFriendModal;
