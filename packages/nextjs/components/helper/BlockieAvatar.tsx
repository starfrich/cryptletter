"use client";

import Image from "next/image";
import { AvatarComponent } from "@rainbow-me/rainbowkit";
import { blo } from "blo";

// Custom Avatar for RainbowKit using Next.js Image component
export const BlockieAvatar: AvatarComponent = ({ address, ensImage, size }) => (
  <Image
    className="rounded-full"
    src={ensImage || blo(address as `0x${string}`)}
    width={size}
    height={size}
    alt={`${address} avatar`}
  />
);
