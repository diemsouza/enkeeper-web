import { useEffect, useState } from "react";

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const check =
        /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ||
        window.matchMedia("(pointer: coarse)").matches;
      setIsMobile(check);
    }
  }, []);

  return isMobile;
}
