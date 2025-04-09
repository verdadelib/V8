// C:\Users\ADM\Desktop\USB MKT PRO V3\components\ui\multi-select-popover.tsx
import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox"; // Assuming you have a Checkbox component

interface Option {
    value: string;
    label: string;
}

interface MultiSelectPopoverProps {
    options: Option[];
    selectedValues: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    className?: string;
    triggerClassName?: string; // Class for the trigger button
}

export function MultiSelectPopover({
    options,
    selectedValues,
    onChange,
    placeholder = "Selecione...",
    className,
    triggerClassName,
}: MultiSelectPopoverProps) {
    const [open, setOpen] = React.useState(false);

    const handleSelect = (value: string) => {
        const newSelectedValues = selectedValues.includes(value)
            ? selectedValues.filter((v) => v !== value)
            : [...selectedValues, value];
        onChange(newSelectedValues);
    };

    const selectedLabels = options
        .filter((option) => selectedValues.includes(option.value))
        .map((option) => option.label);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between h-auto min-h-9 px-3 py-2", // Base styling similar to input
                        "bg-[#141414] text-white", // Background and text
                        "shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)]", // Inset shadow
                        "border-none", // No border
                        "focus:ring-2 focus:ring-[#1E90FF] focus:ring-offset-2 focus:ring-offset-[hsl(var(--background))]", // Focus ring
                        selectedValues.length === 0 && "text-gray-500", // Placeholder color
                        triggerClassName // Allow custom trigger classes
                    )}
                     style={{ textShadow: `0 0 4px #1E90FF` }}
                >
                    <div className="flex flex-wrap gap-1 flex-grow mr-2">
                        {selectedValues.length > 0 ? (
                             selectedLabels.length <= 2 ? (
                                selectedLabels.join(", ")
                            ) : (
                                <Badge variant="secondary" className="bg-[#1E90FF]/20 border border-[#1E90FF]/50 text-white">
                                    {selectedLabels.length} selecionados
                                </Badge>
                            )
                        ) : (
                            placeholder
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className={cn("w-[--radix-popover-trigger-width] p-0 bg-[#1e2128] border-[#1E90FF]/30 text-white", className)}>
                <Command>
                    <CommandInput placeholder="Pesquisar..." className="text-white placeholder:text-gray-400 border-b border-[#1E90FF]/30 focus:ring-0 focus:border-[#1E90FF]/50" />
                    <CommandList>
                        <CommandEmpty>Nenhuma opção encontrada.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => {
                                const isSelected = selectedValues.includes(option.value);
                                return (
                                    <CommandItem
                                        key={option.value}
                                        value={option.label} // Search based on label
                                        onSelect={() => handleSelect(option.value)}
                                        className="flex items-center justify-between cursor-pointer hover:bg-[#1E90FF]/20 data-[selected=true]:bg-[#1E90FF]/10"
                                    >
                                        <div className="flex items-center mr-2">
                                             <Checkbox
                                                 id={`checkbox-${option.value}`}
                                                 checked={isSelected}
                                                 onCheckedChange={() => handleSelect(option.value)}
                                                 className="mr-2 h-4 w-4 rounded-[3px] border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" // Adjust checkbox style as needed
                                             />
                                            <label
                                                htmlFor={`checkbox-${option.value}`}
                                                className="text-sm cursor-pointer"
                                            >
                                                {option.label}
                                            </label>
                                        </div>

                                        {/* Optional: Keep checkmark for visual confirmation? */}
                                        {/* <Check
                                            className={cn(
                                                "h-4 w-4",
                                                isSelected ? "opacity-100" : "opacity-0"
                                            )}
                                        /> */}
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                         {selectedValues.length > 0 && (
                            <>
                                <CommandSeparator />
                                <CommandGroup>
                                    <CommandItem
                                        onSelect={() => onChange([])}
                                        className="justify-center text-center text-xs text-red-400 hover:bg-red-900/30 cursor-pointer"
                                    >
                                        Limpar seleção
                                    </CommandItem>
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}