"use client";

import { useEffect, useRef, useState } from "react";
import { signIn, signOut, useSession } from "@/lib/auth-client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentChatId = searchParams.get('chatId');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [openMenuChatId, setOpenMenuChatId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const utils = api.useUtils();
  const deleteChatMutation = api.chat.deleteChat.useMutation({
    onSuccess: () => {
      void utils.chat.getChats.invalidate();
      if (currentChatId) {
        void router.push('/');
      }
    }
  });

  // Handle closing menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuChatId(null);
    };
    window.addEventListener("click", handleClickOutside);
    return () => {
      window.removeEventListener("click", handleClickOutside);
    };
  }, [currentChatId, router, utils]);

  const { data: chats } = api.chat.getChats.useQuery(undefined, {
    enabled: !!session?.user?.id,
  });

  const hasSynced = useRef(false);

  useEffect(() => {
    if (session?.user?.id && !hasSynced.current) {
      hasSynced.current = true;
      fetch("/api/auth/sync", { method: "POST" })
        .then((res) => res.json())
        .then((data) => {
          if (data && (data.success || !data.error)) {
            void utils.gmail.searchEmails.invalidate();
            void utils.calendar.searchEvents.invalidate();
          }
        })
        .catch(console.error);
    }
  }, [session?.user?.id, utils]);

  const navItems = [
    {
      name: "Home",
      href: "/",
      icon: (
        <svg className="w-5 h-5 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      )
    },
    {
      name: "Inbox",
      href: "/inbox",
      icon: (
        <svg className="w-5 h-5 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
        </svg>
      )
    },
    {
      name: "Calendar",
      href: "/calendar",
      icon: (
        <svg className="w-5 h-5 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
      )
    },
    {
      name: "Activity",
      href: "/activity",
      icon: (
        <svg className="w-5 h-5 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
        </svg>
      )
    },
    {
      name: "Pricing",
      href: "/pricing",
      icon: (
        <svg className="w-5 h-5 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 8.25h19M2.5 12h19m-16.5 5.25h6m-6 2.25h3m-5.625-10.125a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-12a3 3 0 0 1-3-3v-12Z" />
        </svg>
      )
    },
    {
      name: "Settings",
      href: "/settings",
      icon: (
        <svg className="w-5 h-5 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      )
    },
    {
      name: "Docs",
      href: "/docs",
      icon: (
        <svg className="w-5 h-5 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
        </svg>
      )
    }
  ];

  return (
    <div className="w-full h-full max-w-[1440px] bg-white dark:bg-gray-950 rounded-3xl shadow-2xl border border-gray-200/80 dark:border-gray-900 flex overflow-hidden relative transition-colors duration-200">
      {/* Sidebar */}
      <aside className={`h-full bg-gray-50 dark:bg-[#09080c] border-r border-gray-200 dark:border-gray-900 flex-col pt-6 pb-4 z-10 relative transition-all duration-300 ${
        isSidebarOpen 
          ? 'w-[280px] px-4 flex' 
          : 'w-0 hidden md:w-[80px] md:px-2 md:flex'
      } overflow-hidden`}>
        {/* Logo & Theme Toggle */}
        <div className={`flex items-center justify-between gap-3 px-2 mb-6 whitespace-nowrap ${!isSidebarOpen ? 'justify-center' : ''}`}>
          <div className="flex items-center gap-3 cursor-pointer">
            <Link href="/" className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
              <svg id="Logo" width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" fill="none">
                <g id="logomark">
                  <path fill="#2C4CFD" d="M20 0C17.3922 1.99605e-07 15.1183 1.45568 13.5342 3.63379C13.4379 3.76624 13.3435 3.90193 13.252 4.04004C13.156 4.02057 13.0605 4.00028 12.9648 3.9834C10.312 3.51529 7.67909 4.03688 5.85742 5.8584C4.03613 7.68009 3.5143 10.3131 3.98242 12.9658C3.99931 13.0615 4.02057 13.157 4.04004 13.2529C3.90199 13.3444 3.76618 13.4379 3.63379 13.5342C1.45574 15.1183 0.000113546 17.3923 0 20C0.000113558 22.6077 1.45574 24.8817 3.63379 26.4658C3.76614 26.5621 3.90204 26.6556 4.04004 26.7471C4.0205 26.8433 3.99936 26.9392 3.98242 27.0352C3.51446 29.6879 4.03684 32.321 5.8584 34.1426C7.67994 35.9637 10.3124 36.4855 12.9648 36.0176C13.0606 36.0007 13.1559 35.9794 13.252 35.96C13.3436 36.0981 13.4378 36.2337 13.5342 36.3662C15.1183 38.5443 17.3922 40 20 40C22.6078 40 24.8817 38.5443 26.4658 36.3662C26.5623 36.2335 26.6573 36.0983 26.749 35.96C26.8447 35.9794 26.9398 36.0007 27.0352 36.0176C29.6878 36.4855 32.32 35.963 34.1416 34.1416C35.9629 32.3201 36.4845 29.6877 36.0166 27.0352C35.9997 26.9396 35.9794 26.8439 35.96 26.748C36.0981 26.6565 36.2337 26.5622 36.3662 26.4658C38.5443 24.8817 39.9999 22.6077 40 20C39.9999 17.3923 38.5443 15.1183 36.3662 13.5342C36.2335 13.4376 36.0974 13.3437 35.959 13.252C35.9784 13.1561 35.9987 13.0604 36.0156 12.9648C36.4837 10.3121 35.963 7.67909 34.1416 5.85742C32.3199 4.03599 29.687 3.51526 27.0342 3.9834C26.9391 4.00018 26.8444 4.02071 26.749 4.04004C26.6574 3.90177 26.5622 3.76638 26.4658 3.63379C24.8817 1.45568 22.6078 3.54835e-07 20 0ZM20 32.4355C21.4648 33.7432 23.081 34.7301 24.7168 35.3613C23.4224 37.0556 21.7516 38 20 38C18.2484 38 16.5776 37.0556 15.2832 35.3613C16.919 34.7301 18.5353 33.7432 20 32.4355ZM34.1055 27.7578C34.3801 29.8067 33.8904 31.5645 32.7275 32.7275C31.5646 33.8903 29.8075 34.379 27.7588 34.1045C28.4359 32.5708 28.8593 30.8239 28.9697 28.9688C30.825 28.8582 32.5717 28.4351 34.1055 27.7578ZM5.89551 27.7578C7.42931 28.435 9.1759 28.8583 11.0312 28.9688C11.1417 30.824 11.565 32.5707 12.2422 34.1045C10.1933 34.3792 8.43562 33.8912 7.27246 32.7285C6.10929 31.5653 5.62069 29.8071 5.89551 27.7578ZM26.4824 24.2451C26.7263 25.0959 26.8923 26.0072 26.9619 26.9619C26.3643 26.9183 25.7839 26.8363 25.2246 26.7217C24.9825 27.347 24.6924 27.9675 24.3574 28.5771C25.1934 28.7751 26.0669 28.9076 26.9668 28.9648C26.85 30.6906 26.4234 32.2773 25.7773 33.6221C24.3016 33.1061 22.796 32.2332 21.4141 31.0176C22.0976 30.246 22.6913 29.4321 23.1924 28.5967C23.6048 27.9091 23.9555 27.2068 24.2383 26.5H24.3105C24.2891 26.494 24.2675 26.4885 24.2461 26.4824C24.4704 25.9187 24.6506 25.3516 24.7891 24.7881C25.3524 24.6496 25.9189 24.4695 26.4824 24.2451ZM25.7773 6.37695C26.4236 7.72183 26.8499 9.30905 26.9668 11.0352C25.7353 11.1134 24.553 11.3307 23.4492 11.668C22.7006 11.8967 21.9887 12.1812 21.3223 12.5146C20.8835 12.7345 20.4647 12.9754 20.0684 13.2363C20.2212 16.8693 23.1315 19.7793 26.7646 19.9316C27.0574 19.4873 27.3259 19.015 27.5664 18.5176C28.2604 18.9337 28.9431 19.4287 29.5986 20C29.211 20.3378 28.8117 20.6461 28.4082 20.9297C28.7056 21.5303 28.9656 22.163 29.1836 22.8223C29.8133 22.4057 30.4279 21.9357 31.0176 21.4131C32.2334 22.7949 33.1068 24.3008 33.623 25.7764C32.2783 26.4227 30.6918 26.8489 28.9658 26.9658C28.8995 25.9239 28.733 24.9168 28.4795 23.9629C28.2325 23.0343 27.9015 22.1563 27.498 21.3457C27.2752 20.8982 27.0304 20.4709 26.7646 20.0674C23.1318 20.2197 20.2217 23.1301 20.0684 26.7627C20.5128 27.0555 20.9848 27.3248 21.4824 27.5654C21.0662 28.2597 20.5715 28.9429 20 29.5986C19.662 29.2108 19.354 28.8109 19.0703 28.4072C18.4696 28.7047 17.8371 28.9645 17.1777 29.1826C17.5945 29.8125 18.0641 30.4276 18.5869 31.0176C17.2051 32.2333 15.6991 33.1057 14.2236 33.6221C13.5775 32.2773 13.151 30.6908 13.0342 28.9648C14.2795 28.8856 15.4745 28.6642 16.5889 28.3203C17.3076 28.0986 17.9921 27.8254 18.6348 27.5068C19.0896 27.2812 19.5231 27.0324 19.9326 26.7627C19.7793 23.1308 16.8692 20.2207 13.2373 20.0674C12.9443 20.512 12.6753 20.9846 12.4346 21.4824C11.74 21.0662 11.0564 20.5717 10.4004 20C10.7887 19.6616 11.1885 19.3525 11.5928 19.0684C11.2955 18.4679 11.0353 17.8358 10.8174 17.1768C10.1874 17.5933 9.57241 18.0632 8.98242 18.5859C7.76712 17.2043 6.8941 15.699 6.37793 14.2236C7.72278 13.5774 9.30916 13.15 11.0352 13.0332C11.1134 14.2649 11.3305 15.4478 11.668 16.5518C11.8894 17.2765 12.1646 17.9663 12.4844 18.6143C12.7125 19.0762 12.9639 19.5162 13.2373 19.9316C16.8695 19.7783 19.7798 16.8687 19.9326 13.2363C19.488 12.9433 19.0155 12.6743 18.5176 12.4336C18.9337 11.7393 19.4285 11.0562 20 10.4004C20.3383 10.7885 20.6476 11.1879 20.9316 11.5918C21.5321 11.2946 22.1642 11.0343 22.8232 10.8164C22.4065 10.1863 21.936 9.57147 21.4131 8.98145C22.7952 7.76576 24.3015 6.89304 25.7773 6.37695ZM8.98145 21.4131C9.73265 22.0788 10.5236 22.6596 11.3359 23.1523C12.045 23.5826 12.77 23.9462 13.5 24.2383V24.3105C13.5059 24.2895 13.5116 24.2681 13.5176 24.2471C14.081 24.4713 14.6477 24.6506 15.2109 24.7891C15.3494 25.3523 15.5297 25.919 15.7539 26.4824C14.9036 26.7261 13.9932 26.8923 13.0391 26.9619C13.0827 26.364 13.1648 25.7832 13.2793 25.2236C12.6536 24.9814 12.0328 24.6917 11.4229 24.3564C11.2249 25.1924 11.0924 26.066 11.0352 26.9658C9.30948 26.849 7.72359 26.4224 6.37891 25.7764C6.89503 24.301 7.7661 22.7947 8.98145 21.4131ZM35.3613 15.2822C37.0558 16.5766 37.9999 18.2483 38 20C37.9999 21.7512 37.056 23.4225 35.3623 24.7168C34.731 23.0808 33.7435 21.464 32.4355 19.999C33.7431 18.5342 34.7303 16.918 35.3613 15.2822ZM4.63867 15.2832C5.26975 16.9189 6.25603 18.5353 7.56348 20C6.25593 21.4647 5.26888 23.0811 4.6377 24.7168C2.94403 23.4225 2.00011 21.7512 2 20C2.00011 18.2485 2.94453 16.5776 4.63867 15.2832ZM28.9658 13.0332C30.6914 13.1501 32.2775 13.5776 33.6221 14.2236C33.1057 15.6988 32.2329 17.2044 31.0176 18.5859C30.2719 17.9252 29.4876 17.3469 28.6816 16.8564C27.9673 16.4218 27.2357 16.056 26.5 15.7617V15.6895C26.494 15.7108 26.4885 15.7326 26.4824 15.7539C25.9193 15.5298 25.353 15.3494 24.79 15.2109C24.6516 14.6476 24.4704 14.0811 24.2461 13.5176C25.0967 13.2738 26.0075 13.1077 26.9619 13.0381C26.9183 13.6356 26.8372 14.2162 26.7227 14.7754C27.3484 15.0177 27.9691 15.3082 28.5791 15.6436C28.7771 14.8074 28.9086 13.9332 28.9658 13.0332ZM14.2236 6.37793C15.6987 6.89421 17.2045 7.76625 18.5859 8.98145C17.9251 9.7272 17.3478 10.5122 16.8574 11.3184C16.4227 12.0328 16.0561 12.7642 15.7617 13.5H15.6924C15.7125 13.5057 15.7329 13.5109 15.7529 13.5166C15.5285 14.0803 15.3485 14.6474 15.21 15.2109C14.6472 15.3493 14.0815 15.5299 13.5186 15.7539C13.2748 14.9033 13.1087 13.9925 13.0391 13.0381C13.6369 13.0817 14.2178 13.1618 14.7773 13.2764C15.0196 12.651 15.3094 12.0305 15.6445 11.4209C14.8083 11.2231 13.9342 11.0924 13.0342 11.0352C13.1511 9.30925 13.5775 7.72271 14.2236 6.37793ZM27.7578 5.89453C29.8069 5.6199 31.5645 6.10941 32.7275 7.27246C33.8902 8.43544 34.3799 10.1926 34.1055 12.2412C32.5718 11.564 30.8249 11.1418 28.9697 11.0312C28.8592 9.17566 28.4352 7.42847 27.7578 5.89453ZM7.27148 7.27246C8.43485 6.10924 10.1935 5.61945 12.2432 5.89453C11.5657 7.42854 11.1418 9.17554 11.0312 11.0312C9.17609 11.1417 7.4292 11.5641 5.89551 12.2412C5.62111 10.1927 6.10893 8.43539 7.27148 7.27246ZM20 2C21.7513 2 23.4224 2.94396 24.7168 4.6377C23.081 5.26874 21.4649 6.25592 20 7.56348C18.5354 6.25608 16.9188 5.26976 15.2832 4.63867C16.5776 2.94455 18.2485 2 20 2Z" clip-rule="evenodd" fill-rule="evenodd" />
                </g>
              </svg>
            </Link>
            {isSidebarOpen && (
              <Link href="/" className="font-bold text-lg text-gray-800 dark:text-gray-100 tracking-tight">
                Camail
              </Link>
            )}
          </div>
          
          {isSidebarOpen && (
            <button
              onClick={toggleDarkMode}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors cursor-pointer"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? (
                <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464-4.95a1 1 0 11-1.414-1.414 1 1 0 011.414 1.414zm2.536 4.95a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zm-4.95 4.95a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-4.95-1.414a1 1 0 11-1.414 1.414 1 1 0 011.414-1.414zM4 10a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm1.464 4.95a1 1 0 11-1.414-1.414 1 1 0 011.414 1.414z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          )}
        </div>
        
        {/* Search Box */}
        {isSidebarOpen && (
          <div className="px-2 mb-6 whitespace-nowrap">
            <div className="relative flex items-center w-full h-10 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 focus-within:ring-2 focus-within:ring-purple-200 focus-within:border-purple-300 transition-all">
              <svg className="w-4 h-4 text-gray-400 absolute left-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
              <input className="w-full h-full bg-transparent border-none focus:ring-0 text-sm pl-9 pr-3 text-gray-800 dark:text-gray-100 placeholder-gray-400 rounded-xl outline-none" placeholder="Search chat" type="text"/>
            </div>
          </div>
        )}
        
        {/* Main Navigation */}
        <nav className={`flex-1 overflow-y-auto custom-scrollbar px-2 space-y-8 ${isSidebarOpen ? 'min-w-[240px]' : 'w-full'}`}>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href && (!currentChatId || item.name !== 'Home');
              return (
                <li key={item.name}>
                  <Link 
                    href={item.href} 
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm group ${
                      isActive 
                        ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/50 shadow-sm" 
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white"
                    } ${!isSidebarOpen ? "justify-center" : ""}`}
                    title={!isSidebarOpen ? item.name : undefined}
                  >
                    <span className={isActive ? "text-purple-600 dark:text-purple-400" : "text-gray-400 dark:text-gray-500 group-hover:text-purple-500"}>
                      {item.icon}
                    </span>
                    {isSidebarOpen && (
                      <span className={isActive ? "text-purple-700 dark:text-purple-300" : "text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors"}>
                        {item.name}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Chat History Section */}
          <div className="pt-2">
            {isSidebarOpen ? (
              <div className="flex items-center justify-between px-3 mb-2">
                <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Recent Chats</h3>
                <button 
                  onClick={() => router.push('/')}
                  className="text-gray-400 dark:text-gray-500 hover:text-purple-500 transition-colors"
                  title="New Chat"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                </button>
              </div>
            ) : (
              <div className="h-px bg-gray-200 dark:bg-gray-900 my-4" />
            )}
            <ul className="space-y-1">
              {(chats as { id: string; title: string }[])?.map((chat) => (
                <li key={chat.id} className="relative group/item flex items-center w-full">
                  <Link 
                    href={`/?chatId=${chat.id}`}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all font-medium text-sm group flex-1 min-w-0 ${
                      currentChatId === chat.id
                        ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/50 shadow-sm" 
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white"
                    } ${!isSidebarOpen ? "justify-center" : ""}`}
                    title={!isSidebarOpen ? chat.title : undefined}
                  >
                    <span className={currentChatId === chat.id ? "text-purple-600 dark:text-purple-400" : "text-gray-400 dark:text-gray-500 group-hover:text-purple-500"}>
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                      </svg>
                    </span>
                    {isSidebarOpen && (
                      <span className={`truncate flex-1 pr-6 transition-colors ${
                        currentChatId === chat.id 
                          ? "text-purple-700 dark:text-purple-300" 
                          : "text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                      }`}>
                        {chat.title}
                      </span>
                    )}
                  </Link>
                  
                  {isSidebarOpen && (
                    <div className="absolute right-2 opacity-0 group-hover/item:opacity-100 transition-opacity z-20">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenuChatId(openMenuChatId === chat.id ? null : chat.id);
                        }}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md transition-colors cursor-pointer"
                        title="Chat Actions"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                      
                      {openMenuChatId === chat.id && (
                        <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg rounded-xl py-1 z-30">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteChatMutation.mutate({ chatId: chat.id });
                              setOpenMenuChatId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                          >
                            Delete Chat
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
              {chats?.length === 0 && isSidebarOpen && (
                <div className="px-3 py-2 text-xs text-gray-400 italic">No recent chats</div>
              )}
            </ul>
          </div>
        </nav>
        
        {/* Upgrade Card or Slim Theme Toggle */}
        {isSidebarOpen ? (
          <div className="mt-auto pt-4 px-2 whitespace-nowrap min-w-[240px]">
            <Link href="/pricing" className="block bg-gradient-to-br from-[#fdfbfb] to-[#ebedee] dark:from-gray-900 dark:to-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm relative overflow-hidden group hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center gap-2 mb-2 relative z-10">
                <span className="text-sm font-bold text-gray-800 dark:text-gray-100">Upgrade to</span>
                <span className="text-[10px] font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 px-2 py-0.5 rounded-full uppercase tracking-wider">Pro</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 relative z-10 leading-relaxed whitespace-normal">
                Upgrade for image uploads, smarter AI, and more Pro Search.
              </p>
            </Link>
          </div>
        ) : (
          <div className="mt-auto pt-4 flex justify-center w-full">
            <button
              onClick={toggleDarkMode}
              className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-900 flex items-center justify-center transition-all shadow-sm cursor-pointer"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? (
                <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464-4.95a1 1 0 11-1.414-1.414 1 1 0 011.414 1.414zm2.536 4.95a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zm-4.95 4.95a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-4.95-1.414a1 1 0 11-1.414 1.414 1 1 0 011.414-1.414zM4 10a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm1.464 4.95a1 1 0 11-1.414-1.414 1 1 0 011.414 1.414z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col h-full relative z-0 overflow-hidden bg-white dark:bg-[#0f0e13]">
        {/* Top Bar Header */}
        <header className="h-20 px-4 sm:px-8 flex items-center justify-between flex-shrink-0 relative z-20 border-b border-gray-100 dark:border-gray-900 bg-white dark:bg-[#0f0e13]">
          <div className="flex items-center gap-3">
            {/* Sidebar Toggle Button */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-500 hover:text-gray-800 dark:text-gray-100 dark:hover:bg-gray-900 hover:bg-gray-50 flex items-center justify-center transition-colors shadow-sm cursor-pointer"
              title="Toggle Sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isSidebarOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                )}
              </svg>
            </button>
            <button className="font-bold text-xl tracking-tight text-gray-800 dark:text-gray-100 md:hidden">
              Camail
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            {isPending ? (
              <span className="text-sm text-gray-400">Loading...</span>
            ) : session ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => signOut()} 
                  className="text-xs font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">{session.user.name}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">{session.user.email}</div>
                  </div>
                  {session.user.image ? (
                    <img alt="User Avatar" className="w-10 h-10 rounded-full border border-gray-100 dark:border-gray-900 shadow-sm object-cover" src={session.user.image} />
                  ) : (
                    <div className="w-10 h-10 rounded-full border border-gray-100 dark:border-gray-900 shadow-sm bg-gray-200 dark:bg-gray-800 flex items-center justify-center font-bold text-gray-500">
                      {session.user.name?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button 
                onClick={() => signIn.social({ provider: "google" })}
                className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium px-4 py-2 rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 shadow-sm transition-all cursor-pointer"
              >
                Sign In with Google
              </button>
            )}
          </div>
        </header>

        {/* Page children viewport */}
        <div className="flex-1 relative overflow-hidden flex flex-col bg-white dark:bg-[#0f0e13]">
          {children}
        </div>
      </main>
    </div>
  );
}
