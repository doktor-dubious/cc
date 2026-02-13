import type { Config } from "tailwindcss"

const config: Config =
{
    content:
    [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],

    darkMode: "class", // enable class-based dark mode

    theme:
    {
        extend:
        {
            fontFamily:
            {
                sans      : ["var(--font-roboto)", "system-ui", "sans-serif"],
                /*
                sans      : ["var(--font-geograph)", "system-ui", "sans-serif"],
                intge     : ["var(--font-inter-sans)"],
                geograph  : ["var(--font-geograph)"],
                playfair  : ["var(--font-playfair)"],
                */
            },

            colors: {
                background: "var(--background)",
            },


            keyframes:
            {
                "accordion-down":
                {
                    from: { height: "0" },
                    to: { height: "var(--radix-collapsible-content-height)" },
                },

                "accordion-up":
                {
                    from: { height: "var(--radix-collapsible-content-height)" },
                    to: { height: "0" },
                },
            },

            animation:
            {
                "accordion-down": "accordion-down 0.6s ease-in-out",
                "accordion-up": "accordion-up 0.6s ease-in-out",
            },
        },
    },

    plugins: [],
}

export default config