import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { ProfileData } from "@/components/modals/ProfileModal";

type DailyUsage = {
  used: number;
  limit: number;
  remaining: number;
};

type UseDashboardAuthParams = {
  loadProfile: (data: ProfileData, profileCompleted?: boolean) => void;
  loadConversations: (token: string, activeId?: string) => Promise<void>;
};

/**
 * Controla a autenticação e os dados iniciais do dashboard.
 *
 * Responsável por:
 * - verificar se o usuário está logado;
 * - carregar nome, e-mail e perfil do usuário;
 * - carregar o uso diário de mensagens;
 * - carregar as conversas salvas;
 * - realizar logout.
 */
export function useDashboardAuth({
  loadProfile,
  loadConversations,
}: UseDashboardAuthParams) {
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [dailyUsage, setDailyUsage] = useState<DailyUsage>({
    used: 0,
    limit: 15,
    remaining: 15,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/";
        return;
      }

      setUserId(user.uid);
      setUserEmail(user.email ?? "");

      const token = await user.getIdToken();

      const usageResponse = await fetch("http://localhost:3001/chat/usage", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        setDailyUsage(usageData);
      }

      await loadConversations(token);

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();

        setUserName(data.name ?? user.displayName ?? "");

        const loadedProfile: ProfileData = {
          age: data.age ?? "",
          gender: data.gender ?? "",
          weight: data.weight ?? "",
          height: data.height ?? "",
          goal: data.goal ?? "",
          limitations: data.limitations ?? "",
        };

        loadProfile(loadedProfile, data.profileCompleted);
      }

      setIsCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [loadProfile, loadConversations]);

  /**
   * Encerra a sessão do usuário e redireciona para a página inicial.
   */
  const handleLogout = useCallback(async function handleLogout() {
    await signOut(auth);
    window.location.href = "/";
  }, []);

  return {
    userId,
    userEmail,
    userName,
    isCheckingAuth,
    dailyUsage,
    setDailyUsage,
    handleLogout,
  };
}