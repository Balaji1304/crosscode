import { memo, useEffect, useRef, useState } from "react"
import { Pressable, View } from "react-native"
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated"
import BrainIcon from "lucide-react-native/dist/esm/icons/brain"
import ChevronDownIcon from "lucide-react-native/dist/esm/icons/chevron-down"
import { THEME } from "@/lib/theme"
import { Text } from "@/components/ui/text"
import { ShimmerText } from "./shimmer-text"

interface ReasoningBlockProps {
    text: string
    streaming?: boolean
    startedAt?: number
    endedAt?: number
    theme: "light" | "dark"
}

function cleanReasoningText(raw: string): string {
    return raw
        .replace(/<\/?thinking[^>]*>/gi, "")
        .replace(/<\/?think[^>]*>/gi, "")
        .trim()
}

function formatThoughtDuration(totalSeconds: number): string {
    const rounded = Math.max(1, Math.round(totalSeconds))
    if (rounded < 60) return `${rounded} second${rounded === 1 ? "" : "s"}`
    const minutes = Math.floor(rounded / 60)
    const seconds = rounded % 60
    return `${minutes}m ${seconds}s`
}

export const ReasoningBlock = memo(function ReasoningBlock({ text, streaming, startedAt, endedAt, theme }: ReasoningBlockProps) {
    const [expanded, setExpanded] = useState(true)
    const [elapsed, setElapsed] = useState<number | null>(
        startedAt != null && endedAt != null ? Math.max(0, (endedAt - startedAt) / 1000) : null,
    )
    const startRef = useRef<number | null>(null)

    useEffect(() => {
        if (endedAt != null && startedAt != null) {
            setElapsed(Math.max(0, (endedAt - startedAt) / 1000))
            return
        }
        if (streaming) {
            if (startRef.current === null) {
                startRef.current = startedAt ?? Date.now()
            }
            setExpanded(true)
        } else if (startRef.current !== null) {
            setElapsed((Date.now() - startRef.current) / 1000)
            startRef.current = null
        }
    }, [streaming, startedAt, endedAt])

    const chevron = useSharedValue(expanded ? 1 : 0)

    const chevronStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${chevron.value * 180}deg` }],
    }))

    useEffect(() => {
        chevron.value = withTiming(expanded ? 1 : 0, { duration: 200 })
    }, [expanded])

    const toggle = () => {
        setExpanded((prev) => !prev)
    }

    const body = cleanReasoningText(text ?? "")

    if (!streaming && body.length === 0) return null

    return (
        <View>
            <Pressable onPress={toggle} className="flex-row items-center gap-1.5 py-0.5 active:opacity-70">
                <BrainIcon size={13} color={THEME[theme].mutedForeground} />
                {streaming ? (
                    <ShimmerText
                        text="Thinking..."
                        baseColor={THEME[theme].mutedForeground}
                        shineColor={THEME[theme].foreground}
                    />
                ) : (
                    <Text className="text-xs text-muted-foreground font-medium">
                        Thought{elapsed != null ? ` for ${formatThoughtDuration(elapsed)}` : ""}
                    </Text>
                )}
                <Animated.View style={chevronStyle}>
                    <ChevronDownIcon size={12} color={THEME[theme].mutedForeground} />
                </Animated.View>
            </Pressable>
            {expanded && body.length > 0 ? (
                <View className="ml-2 pl-3 border-l border-border/60 pb-1.5 mt-0.5">
                    <Text className="text-xs text-muted-foreground leading-relaxed">
                        {body}
                    </Text>
                </View>
            ) : null}
        </View>
    )
})
