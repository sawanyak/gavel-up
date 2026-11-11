"use client";

import React, { useEffect, useRef } from "react";

interface FloatingCrewmate {
  x: number;
  y: number;
  speedX: number;
  speedY: number;
  rotation: number;
  rotSpeed: number;
  size: number;
  color: string;
  darkColor: string;
}

const CREWMATE_COLORS = [
  { base: "#38FEDC", dark: "#24A8BE" }, // Cyan
  { base: "#ED54BA", dark: "#AB2BAB" }, // Pink
  { base: "#50EF39", dark: "#15A700" }, // Lime
  { base: "#F07D0D", dark: "#B04400" }, // Orange
  { base: "#D6E0F0", dark: "#8394BF" }, // White
  { base: "#6B2FBC", dark: "#3B177C" }, // Purple
];

export const SpaceBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // Starfield particles
    const starCount = Math.min(180, Math.floor((width * height) / 8000));
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.8 + 0.4,
      alpha: Math.random() * 0.8 + 0.2,
      flicker: (Math.random() - 0.5) * 0.02,
      speed: Math.random() * 0.15 + 0.05,
    }));

    // Floating large crewmates in space (like the game title screen)
    const crewmateCount = Math.max(3, Math.min(6, Math.floor(width / 320)));
    const crewmates: FloatingCrewmate[] = Array.from({ length: crewmateCount }, (_, i) => {
      const color = CREWMATE_COLORS[i % CREWMATE_COLORS.length];
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        speedX: (Math.random() - 0.5) * 0.4 + (i % 2 === 0 ? 0.3 : -0.3),
        speedY: (Math.random() - 0.5) * 0.3,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.008,
        size: Math.random() * 35 + 45, // 45px - 80px
        color: color.base,
        darkColor: color.dark,
      };
    });

    // Helper to draw an Among Us character on 2D canvas
    const drawCrewmate = (c: FloatingCrewmate) => {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rotation);

      const scale = c.size / 100;
      ctx.scale(scale, scale);

      // Backpack
      ctx.fillStyle = c.darkColor;
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(-45, -20, 16, 50, 8);
      ctx.fill();
      ctx.stroke();

      // Main Body
      ctx.beginPath();
      // Body shape
      ctx.moveTo(-25, 45);
      ctx.lineTo(-25, -15);
      ctx.arcTo(-25, -45, 25, -45, 25);
      ctx.arcTo(25, -45, 25, -15, 25);
      ctx.lineTo(25, 45);
      ctx.arcTo(25, 52, 10, 52, 6);
      ctx.lineTo(10, 28);
      ctx.lineTo(-10, 28);
      ctx.lineTo(-10, 52);
      ctx.arcTo(-10, 52, -25, 52, 6);
      ctx.closePath();

      ctx.fillStyle = c.darkColor;
      ctx.fill();
      ctx.stroke();

      // Body Highlight
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.moveTo(-23, -15);
      ctx.arcTo(-23, -43, 23, -43, 23);
      ctx.arcTo(23, -43, 23, -15, 23);
      ctx.lineTo(23, 20);
      ctx.quadraticCurveTo(0, 10, -23, 25);
      ctx.closePath();
      ctx.fill();

      // Visor
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.roundRect(0, -26, 36, 22, 11);
      ctx.fill();

      // Visor Glass
      const visorGrad = ctx.createLinearGradient(0, -26, 0, -4);
      visorGrad.addColorStop(0, "#FFFFFF");
      visorGrad.addColorStop(0.3, "#98DDF4");
      visorGrad.addColorStop(1, "#3A7E99");
      ctx.fillStyle = visorGrad;
      ctx.beginPath();
      ctx.roundRect(2, -24, 32, 18, 9);
      ctx.fill();

      // Visor Glare shine
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.beginPath();
      ctx.ellipse(14, -20, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const render = () => {
      // Clear space with deep dark gradient
      ctx.fillStyle = "#030712";
      ctx.fillRect(0, 0, width, height);

      // Draw faint nebulae
      const grad1 = ctx.createRadialGradient(width * 0.2, height * 0.3, 20, width * 0.2, height * 0.3, width * 0.5);
      grad1.addColorStop(0, "rgba(20, 30, 80, 0.25)");
      grad1.addColorStop(1, "transparent");
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const grad2 = ctx.createRadialGradient(width * 0.8, height * 0.7, 40, width * 0.8, height * 0.7, width * 0.45);
      grad2.addColorStop(0, "rgba(80, 20, 60, 0.15)");
      grad2.addColorStop(1, "transparent");
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // Draw Stars
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.y += star.speed;
        if (star.y > height) star.y = 0;

        star.alpha += star.flicker;
        if (star.alpha > 0.9 || star.alpha < 0.2) star.flicker = -star.flicker;

        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw & Update Floating Crewmates
      for (let i = 0; i < crewmates.length; i++) {
        const c = crewmates[i];
        c.x += c.speedX;
        c.y += c.speedY;
        c.rotation += c.rotSpeed;

        // Wrap around borders with margin
        const pad = c.size * 2;
        if (c.x < -pad) c.x = width + pad;
        if (c.x > width + pad) c.x = -pad;
        if (c.y < -pad) c.y = height + pad;
        if (c.y > height + pad) c.y = -pad;

        drawCrewmate(c);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
};
