"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { http, isAxiosError } from "@/app/lib/network";
import { useUser } from "@/app/features/user/components/client/UserContext";
import type { LoginProviderId } from "@/app/lib/auth";

type ProfileDto = {
  id: number;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  createdAt: string;
  hasPassword: boolean;
  loginProviders: LoginProviderId[];
};

async function fetchProfile(): Promise<{ user: ProfileDto }> {
  const { data } = await http.get<{ user: ProfileDto }>(
    "/features/user/api/profile",
  );
  return data;
}

// Keep profile data fetching and mutations out of the component tree.
export function useProfilePage() {
  const { user, isLoading: sessionLoading } = useUser();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [pwPending, setPwPending] = useState(false);

  const [resetPending, setResetPending] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["user-profile"],
    queryFn: fetchProfile,
    enabled: Boolean(user),
  });

  const profile = profileQuery.data?.user ?? null;

  // Keeps editable name input in sync with the latest profile payload.
  useEffect(() => {
    if (profile?.name != null) setName(String(profile.name));
    else if (user?.name) setName(String(user.name));
  }, [profile?.name, user?.name]);

  const displayName = useMemo(() => {
    if (!profile) return "";
    return profile.name?.trim() || user?.name?.trim() || "Member";
  }, [profile, user?.name]);

  const initial = displayName[0]?.toUpperCase() ?? "U";
  const memberSince = useMemo(() => {
    if (!profile) return "";
    return new Date(profile.createdAt).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [profile]);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileMessage(null);
    try {
      await http.patch("/features/user/api/profile", { name: name.trim() });
      setProfileMessage("Saved.");
      await queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["user-session"] });
    } catch {
      setProfileMessage("Could not save.");
    }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordMessage(null);
    if (newPassword !== confirmPassword) {
      setPasswordMessage("New passwords do not match.");
      return;
    }
    setPwPending(true);
    try {
      await http.post("/features/user/api/profile/change-password", {
        currentPassword,
        newPassword,
      });
      setPasswordMessage("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      const code = isAxiosError<{ error?: string }>(error)
        ? error.response?.data?.error
        : undefined;
      if (code === "invalid_current") {
        setPasswordMessage("Current password is incorrect.");
      } else if (code === "rate_limited") {
        setPasswordMessage("Too many attempts. Try again later.");
      } else {
        setPasswordMessage("Could not update password.");
      }
    } finally {
      setPwPending(false);
    }
  };

  const sendResetEmail = async () => {
    if (!profile) return;
    setResetMessage(null);
    setResetPending(true);
    try {
      await http.post("/features/user/api/auth/forgot-password", {
        email: profile.email.trim(),
      });
      setResetMessage(
        "If this account can use password login, check your inbox for a reset link.",
      );
    } catch {
      setResetMessage("Could not send email. Try again later.");
    } finally {
      setResetPending(false);
    }
  };

  return {
    user,
    sessionLoading,
    profile,
    profileQuery,
    name,
    setName,
    msg: profileMessage,
    displayName,
    initial,
    memberSince,
    saveProfile,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    pwMsg: passwordMessage,
    pwPending,
    changePassword,
    resetPending,
    resetMsg: resetMessage,
    sendResetEmail,
  };
}
