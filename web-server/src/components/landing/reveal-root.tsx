"use client";

import { useEffect } from "react";

// Entrada dos elementos [data-reveal] quando chegam ao ecra. Sem JS o conteudo
// fica visivel: so depois de montar e que a classe `reveal-on` os esconde.
// Em vez de IntersectionObserver (que falha em saltos de scroll, como uma
// ancora ou um #hash no URL), revela tudo o que ja esta no ecra ou ficou para
// tras, a cada scroll/resize/hashchange.
export function RevealRoot() {
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;

    function sync() {
      frame = 0;
      const limit = window.innerHeight * 0.94;
      document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)").forEach((el) => {
        if (el.getBoundingClientRect().top < limit) el.classList.add("is-in");
      });
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(sync);
    }

    sync(); // o que ja esta visivel entra sem esconder-se primeiro
    root.classList.add("reveal-on");
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("hashchange", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("hashchange", schedule);
      root.classList.remove("reveal-on");
    };
  }, []);
  return null;
}
