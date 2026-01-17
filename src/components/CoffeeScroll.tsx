"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";

const TOTAL_FRAMES = 120;
const MOBILE_BREAKPOINT = 768;

// Text overlay configuration
const textOverlays = [
    {
        start: 0,
        end: 0.15,
        text: "Brewed",
        subtext: "Pure Origin.",
        alignment: "center" as const,
        showOnLoad: true, // Special flag for initial visibility
    },
    {
        start: 0.25,
        end: 0.4,
        text: "The journey begins",
        subtext: "with the cherry.",
        alignment: "left" as const,
    },
    {
        start: 0.5,
        end: 0.65,
        text: "Roasted for Depth.",
        subtext: "Ground for Flavor.",
        alignment: "right" as const,
    },
    {
        start: 0.8,
        end: 1.0,
        text: "Made just for you.",
        subtext: null,
        alignment: "center" as const,
        isCTA: true,
        brownText: true, // Special flag for brown text color
    },
];

export default function CoffeeScroll() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [images, setImages] = useState<HTMLImageElement[]>([]);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [showScrollIndicator, setShowScrollIndicator] = useState(true);
    const currentFrameRef = useRef(0);

    // Detect viewport size
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Preload all frames
    useEffect(() => {
        const frameFolder = isMobile ? "mobile" : "web";
        const loadedImages: HTMLImageElement[] = [];
        let loadedCount = 0;

        const preloadImages = () => {
            for (let i = 1; i <= TOTAL_FRAMES; i++) {
                const img = new Image();
                const frameNumber = String(i).padStart(3, "0");
                img.src = `/${frameFolder}/ezgif-frame-${frameNumber}.jpg`;

                img.onload = () => {
                    loadedCount++;
                    loadedImages[i - 1] = img;
                    setLoadingProgress(Math.round((loadedCount / TOTAL_FRAMES) * 100));

                    if (loadedCount === TOTAL_FRAMES) {
                        setImages(loadedImages);
                        setIsLoaded(true);
                    }
                };

                img.onerror = () => {
                    console.error(`Failed to load frame ${i}`);
                    loadedCount++;
                    setLoadingProgress(Math.round((loadedCount / TOTAL_FRAMES) * 100));
                };
            }
        };

        preloadImages();
    }, [isMobile]);

    // Scroll progress
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"],
    });

    // Map scroll to frame index
    const frameIndex = useTransform(scrollYProgress, [0, 1], [0, TOTAL_FRAMES - 1]);

    // Canvas drawing function
    const drawFrame = useCallback(
        (index: number) => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (!canvas || !ctx || !images[index]) return;

            const img = images[index];

            // Set canvas size to match viewport (with device pixel ratio for sharpness)
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);

            // Clear canvas
            ctx.clearRect(0, 0, rect.width, rect.height);

            // Calculate object-cover dimensions with extra zoom to hide watermark
            const ZOOM_SCALE = 1.15; // 15% zoom to crop out watermark
            const imgAspect = img.width / img.height;
            const canvasAspect = rect.width / rect.height;

            let drawWidth: number, drawHeight: number, offsetX: number, offsetY: number;

            if (imgAspect > canvasAspect) {
                // Image is wider - fit to height and crop sides
                drawHeight = rect.height * ZOOM_SCALE;
                drawWidth = drawHeight * imgAspect;
            } else {
                // Image is taller - fit to width and crop top/bottom
                drawWidth = rect.width * ZOOM_SCALE;
                drawHeight = drawWidth / imgAspect;
            }

            // Center the image (this will crop edges evenly)
            offsetX = (rect.width - drawWidth) / 2;
            offsetY = (rect.height - drawHeight) / 2;

            // Draw image with high quality
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        },
        [images]
    );

    // Animation loop with requestAnimationFrame
    useEffect(() => {
        if (!isLoaded || images.length === 0) return;

        let animationId: number;

        const render = () => {
            const targetFrame = Math.round(frameIndex.get());
            if (targetFrame !== currentFrameRef.current) {
                currentFrameRef.current = targetFrame;
                drawFrame(targetFrame);
            }
            animationId = requestAnimationFrame(render);
        };

        // Initial draw
        drawFrame(0);
        render();

        return () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        };
    }, [isLoaded, images, frameIndex, drawFrame]);

    // Handle resize
    useEffect(() => {
        if (!isLoaded) return;

        const handleResize = () => {
            drawFrame(currentFrameRef.current);
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [isLoaded, drawFrame]);

    // Track scroll progress for text overlays
    const [currentProgress, setCurrentProgress] = useState(0);
    useMotionValueEvent(scrollYProgress, "change", (latest) => {
        setCurrentProgress(latest);
        // Hide scroll indicator when user starts scrolling, show when at top
        setShowScrollIndicator(latest < 0.01);
    });

    return (
        <>
            {/* Preloader */}
            <motion.div
                className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-cream"
                initial={{ opacity: 1 }}
                animate={{ opacity: isLoaded ? 0 : 1 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                style={{ pointerEvents: isLoaded ? "none" : "auto" }}
            >
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col items-center"
                >
                    <h1 className="font-serif text-4xl md:text-6xl text-coffee-dark mb-8 tracking-tight">
                        BREWED
                    </h1>
                    <div className="w-64 md:w-80 h-1 bg-coffee-dark/10 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-coffee-dark rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${loadingProgress}%` }}
                            transition={{ duration: 0.1 }}
                        />
                    </div>
                    <p className="mt-4 text-sm text-coffee-dark/60 font-sans tracking-widest uppercase">
                        Loading Experience • {loadingProgress}%
                    </p>
                </motion.div>
            </motion.div>

            {/* Main scroll container */}
            <section ref={containerRef} className="relative h-[600vh]">
                {/* Sticky canvas wrapper */}
                <div className="sticky top-0 left-0 w-full h-screen flex items-center justify-center overflow-hidden bg-cream">
                    <canvas
                        ref={canvasRef}
                        className="w-full h-full"
                        style={{ display: isLoaded ? "block" : "none" }}
                    />

                    {/* Scroll Indicator */}
                    {isLoaded && (
                        <motion.div
                            className="absolute bottom-8 inset-x-0 flex justify-center pointer-events-none"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{
                                opacity: showScrollIndicator ? 1 : 0,
                                y: showScrollIndicator ? 0 : 10
                            }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                        >
                            <div className="flex flex-col items-center gap-2">
                                <span className="font-sans text-xs text-coffee-dark/60 uppercase tracking-widest">Scroll to explore</span>
                                <motion.div
                                    className="w-6 h-10 border-2 border-coffee-dark/30 rounded-full flex justify-center pt-2"
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                >
                                    <motion.div
                                        className="w-1.5 h-1.5 bg-coffee-dark/60 rounded-full"
                                        animate={{ y: [0, 12, 0] }}
                                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                    />
                                </motion.div>
                            </div>
                        </motion.div>
                    )}

                    {/* Text overlays */}
                    {isLoaded &&
                        textOverlays.map((overlay, index) => {
                            const isVisible =
                                currentProgress >= overlay.start && currentProgress <= overlay.end;

                            // Calculate opacity based on fade in/out
                            const fadeRange = 0.03;
                            let opacity = 0;

                            // Special handling for first overlay - visible on load
                            if (overlay.showOnLoad && currentProgress <= overlay.end) {
                                if (currentProgress > overlay.end - fadeRange) {
                                    opacity = (overlay.end - currentProgress) / fadeRange;
                                } else {
                                    opacity = 1;
                                }
                            } else if (currentProgress >= overlay.start && currentProgress <= overlay.end) {
                                if (currentProgress < overlay.start + fadeRange) {
                                    opacity = (currentProgress - overlay.start) / fadeRange;
                                } else if (currentProgress > overlay.end - fadeRange) {
                                    opacity = (overlay.end - currentProgress) / fadeRange;
                                } else {
                                    opacity = 1;
                                }
                            }

                            return (
                                <motion.div
                                    key={index}
                                    className={`absolute inset-0 flex flex-col pointer-events-none px-6 md:px-16 lg:px-24 ${overlay.alignment === "center"
                                        ? "items-center justify-center text-center"
                                        : overlay.alignment === "left"
                                            ? "items-start justify-center text-left"
                                            : "items-end justify-center text-right"
                                        }`}
                                    style={{ opacity }}
                                >
                                    <div className="max-w-2xl">
                                        <motion.h2
                                            className={`font-serif text-3xl md:text-5xl lg:text-7xl leading-tight ${overlay.brownText
                                                ? 'text-coffee-dark drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)]'
                                                : 'text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
                                                }`}
                                            initial={{ y: 30 }}
                                            animate={{ y: isVisible ? 0 : 30 }}
                                            transition={{ duration: 0.6, ease: "easeOut" }}
                                        >
                                            {overlay.text}
                                        </motion.h2>
                                        {overlay.subtext && (
                                            <motion.p
                                                className="font-serif text-2xl md:text-4xl lg:text-5xl text-white/90 mt-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.4)]"
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: isVisible ? 0 : 20, opacity: isVisible ? 1 : 0 }}
                                                transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                                            >
                                                {overlay.subtext}
                                            </motion.p>
                                        )}
                                        {overlay.isCTA && (
                                            <motion.button
                                                className="mt-8 px-8 py-4 bg-coffee-dark text-white font-sans text-sm md:text-base tracking-widest uppercase rounded-full hover:bg-coffee-medium transition-colors duration-300 pointer-events-auto shadow-lg"
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: isVisible ? 0 : 20, opacity: isVisible ? 1 : 0 }}
                                                transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' })}
                                            >
                                                Explore Our Coffee
                                            </motion.button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                </div>
            </section>

            {/* Explore Our Coffee Section */}
            <section id="explore" className="relative bg-cream py-24 px-6 md:px-16 lg:px-24">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="font-serif text-4xl md:text-6xl text-coffee-dark mb-4">Explore Our Coffee</h2>
                        <p className="font-sans text-coffee-dark/60 text-lg max-w-2xl mx-auto">
                            Discover our carefully curated selection of single-origin beans, each telling its own unique story.
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { name: "Ethiopian Yirgacheffe", notes: "Floral, citrus, tea-like", intensity: "Light", image: "/ethiopian.png" },
                            { name: "Colombian Supremo", notes: "Caramel, nutty, balanced", intensity: "Medium", image: "/colombian.png" },
                            { name: "Sumatran Mandheling", notes: "Earthy, chocolate, bold", intensity: "Dark", image: "/sumatran.png" },
                        ].map((coffee, index) => (
                            <motion.div
                                key={coffee.name}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                viewport={{ once: true }}
                                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 group cursor-pointer"
                            >
                                <div className="w-full h-48 rounded-xl mb-6 overflow-hidden">
                                    <img
                                        src={coffee.image}
                                        alt={coffee.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                </div>
                                <h3 className="font-serif text-2xl text-coffee-dark mb-2 group-hover:text-coffee-medium transition-colors">{coffee.name}</h3>
                                <p className="font-sans text-coffee-dark/60 text-sm mb-4">{coffee.notes}</p>
                                <span className="inline-block px-4 py-1 bg-cream text-coffee-dark text-xs font-sans uppercase tracking-wider rounded-full">
                                    {coffee.intensity}
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Our Story Section */}
            <section id="story" className="relative bg-coffee-dark py-24 px-6 md:px-16 lg:px-24">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="font-serif text-4xl md:text-6xl text-cream mb-6">Our Story</h2>
                            <p className="font-sans text-cream/70 text-lg leading-relaxed mb-6">
                                Born from a passion for exceptional coffee and meaningful connections, Brewed started in a small roastery with a simple mission: to bring people together over the perfect cup.
                            </p>
                            <p className="font-sans text-cream/70 text-lg leading-relaxed mb-8">
                                We travel to the world&apos;s finest coffee-growing regions, building direct relationships with farmers who share our commitment to quality and sustainability. Every bean we source tells a story of craftsmanship, community, and care.
                            </p>
                            <div className="border-l-2 border-cream/30 pl-6">
                                <p className="font-serif text-cream text-2xl mb-1">Since 2018</p>
                                <p className="font-sans text-cream/60 text-sm">Roasting with passion</p>
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8 }}
                            viewport={{ once: true }}
                            className="relative"
                        >
                            <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl">
                                <img
                                    src="/since.png"
                                    alt="Our premium coffee beans"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>


            {/* Footer */}
            <footer className="relative bg-coffee-dark py-16 px-6 md:px-16 lg:px-24">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-4 gap-8 mb-12">
                        <div>
                            <h4 className="font-serif text-2xl text-cream mb-4">Brewed</h4>
                            <p className="font-sans text-cream/60 text-sm leading-relaxed">
                                Pure Origin. Made for coffee lovers who appreciate the journey from cherry to cup.
                            </p>
                        </div>
                        <div>
                            <h5 className="font-sans text-cream text-sm uppercase tracking-wider mb-4">Explore</h5>
                            <ul className="space-y-2">
                                <li><a href="#explore" className="font-sans text-cream/60 text-sm hover:text-cream transition-colors">Our Coffee</a></li>
                                <li><a href="#story" className="font-sans text-cream/60 text-sm hover:text-cream transition-colors">Our Story</a></li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="font-sans text-cream text-sm uppercase tracking-wider mb-4">Support</h5>
                            <ul className="space-y-2">
                                <li><a href="#" className="font-sans text-cream/60 text-sm hover:text-cream transition-colors">Contact Us</a></li>
                                <li><a href="#" className="font-sans text-cream/60 text-sm hover:text-cream transition-colors">FAQ</a></li>
                                <li><a href="#" className="font-sans text-cream/60 text-sm hover:text-cream transition-colors">Shipping</a></li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="font-sans text-cream text-sm uppercase tracking-wider mb-4">Connect</h5>
                            <ul className="space-y-2">
                                <li><a href="#" className="font-sans text-cream/60 text-sm hover:text-cream transition-colors">Instagram</a></li>
                                <li><a href="#" className="font-sans text-cream/60 text-sm hover:text-cream transition-colors">Twitter</a></li>
                                <li><a href="#" className="font-sans text-cream/60 text-sm hover:text-cream transition-colors">Facebook</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-cream/10 text-center">
                        <p className="font-sans text-cream/40 text-sm tracking-wider">
                            © 2026 Brewed. Pure Origin. Made with ❤️ for coffee lovers.
                        </p>
                    </div>
                </div>
            </footer>
        </>
    );
}
