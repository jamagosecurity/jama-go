import { useCallback, useEffect, useRef, useState } from "react";

const CLOSE_DELAY_MS = 275;
const DESKTOP_MQ = "(min-width: 901px)";
const AIM_PADDING_PX = 20;

function expandRect(rect, pad) {
  return {
    left: rect.left - pad,
    right: rect.right + pad,
    top: rect.top - pad,
    bottom: rect.bottom + pad,
  };
}

function isPointInRect(x, y, rect) {
  return (
    x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
  );
}

function getSafeZoneRects(dropdownEl) {
  const trigger = dropdownEl.querySelector(".nav-link--dropdown");
  const mega = dropdownEl.querySelector(".nav-mega");
  if (!trigger || !mega) return [];

  const triggerRect = trigger.getBoundingClientRect();
  const megaRect = mega.getBoundingClientRect();
  const pad = AIM_PADDING_PX;

  const bridge = {
    left: Math.min(triggerRect.left, megaRect.left) - pad,
    right: Math.max(triggerRect.right, megaRect.right) + pad,
    top: triggerRect.bottom - pad,
    bottom: megaRect.top + pad,
  };

  return [
    expandRect(triggerRect, pad),
    expandRect(megaRect, pad),
    bridge,
  ];
}

export function isPointerInSafeZone(x, y, dropdownEl) {
  return getSafeZoneRects(dropdownEl).some((rect) =>
    isPointInRect(x, y, rect)
  );
}

export default function useMegaMenu() {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isDesktopNav, setIsDesktopNav] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(DESKTOP_MQ).matches
      : true
  );

  const closeTimerRef = useRef(null);
  const dropdownRefs = useRef({});

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const closeDropdown = useCallback(() => {
    cancelClose();
    setOpenDropdown(null);
  }, [cancelClose]);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => {
      setOpenDropdown(null);
      closeTimerRef.current = null;
    }, CLOSE_DELAY_MS);
  }, [cancelClose]);

  const handleDropdownEnter = useCallback(
    (label) => {
      if (!isDesktopNav) return;
      cancelClose();
      setOpenDropdown(label);
    },
    [isDesktopNav, cancelClose]
  );

  const handleDropdownLeave = useCallback(() => {
    if (!isDesktopNav) return;
    scheduleClose();
  }, [isDesktopNav, scheduleClose]);

  const setDropdownRef = useCallback(
    (label) => (el) => {
      if (el) {
        dropdownRefs.current[label] = el;
      } else {
        delete dropdownRefs.current[label];
      }
    },
    []
  );

  const getDropdownHandlers = useCallback(
    (label) => ({
      ref: setDropdownRef(label),
      onMouseEnter: () => handleDropdownEnter(label),
      onMouseLeave: handleDropdownLeave,
      onFocus: () => handleDropdownEnter(label),
      onBlur: (e) => {
        if (!isDesktopNav) return;
        if (!e.currentTarget.contains(e.relatedTarget)) {
          scheduleClose();
        }
      },
    }),
    [
      handleDropdownEnter,
      handleDropdownLeave,
      isDesktopNav,
      scheduleClose,
      setDropdownRef,
    ]
  );

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const syncViewport = (event) => setIsDesktopNav(event.matches);
    syncViewport(mq);
    mq.addEventListener("change", syncViewport);
    return () => mq.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => () => cancelClose(), [cancelClose]);

  useEffect(() => {
    if (!openDropdown || !isDesktopNav) return;

    const onMouseMove = (e) => {
      const activeEl = dropdownRefs.current[openDropdown];
      if (!activeEl) return;

      if (isPointerInSafeZone(e.clientX, e.clientY, activeEl)) {
        cancelClose();
      }
    };

    document.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => document.removeEventListener("mousemove", onMouseMove);
  }, [openDropdown, isDesktopNav, cancelClose]);

  useEffect(() => {
    if (!openDropdown || !isDesktopNav) return;

    const onPointerDown = (e) => {
      const activeEl = dropdownRefs.current[openDropdown];
      if (activeEl && !activeEl.contains(e.target)) {
        closeDropdown();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openDropdown, isDesktopNav, closeDropdown]);

  useEffect(() => {
    if (!openDropdown) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        closeDropdown();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openDropdown, closeDropdown]);

  return {
    openDropdown,
    setOpenDropdown,
    isDesktopNav,
    closeDropdown,
    getDropdownHandlers,
  };
}
