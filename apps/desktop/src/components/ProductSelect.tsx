import { useEffect, useRef, useState } from "react";

type Product = {
    id: string;
    name: string;
    unit: string;
    costPrice?: number;
    salePrice?: number;
};

export function ProductSelect({
    products,
    value,
    onChange,
    disabled,
    placeholder = "Mahsulot tanlang",
}: {
    products: Product[];
    value: string;
    onChange: (id: string) => void;
    disabled?: boolean;
    placeholder?: string;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [index, setIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedProduct = products.find((p) => p.id === value);
    const filtered = products.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase())
    );

    useEffect(() => {
        if (open) {
            setIndex(0);
            inputRef.current?.focus();
        }
    }, [open]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    function onKeyDown(e: React.KeyboardEvent) {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setIndex((i) => (i + 1) % filtered.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setIndex((i) => (i - 1 + filtered.length) % filtered.length);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (filtered[index]) {
                onChange(filtered[index].id);
                setOpen(false);
                setQuery("");
            }
        } else if (e.key === "Escape") {
            setOpen(false);
        }
    }

    return (
        <div ref={containerRef} className="relative w-full">
            <div
                onClick={() => !disabled && setOpen(!open)}
                className={`w-full cursor-pointer rounded-2xl border bg-white px-3 py-2 text-sm outline-none ${open ? "border-neutral-400" : "border-neutral-200"
                    } ${disabled ? "opacity-50" : ""}`}
            >
                {selectedProduct ? selectedProduct.name : placeholder}
            </div>

            {open && (
                <div className="absolute left-0 top-full z-[100] mt-1 w-full rounded-2xl border border-neutral-200 bg-white p-2 shadow-lg">
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Qidiruv..."
                        className="w-full rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-neutral-300"
                    />
                    <div className="mt-2 max-h-60 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-neutral-500 text-center">Natija yo'q</div>
                        ) : (
                            filtered.map((p, i) => (
                                <div
                                    key={p.id}
                                    onClick={() => {
                                        onChange(p.id);
                                        setOpen(false);
                                        setQuery("");
                                    }}
                                    className={`cursor-pointer rounded-xl px-3 py-2 text-sm ${i === index ? "bg-neutral-900 text-white" : "hover:bg-neutral-50 text-neutral-900"
                                        }`}
                                >
                                    {p.name}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
