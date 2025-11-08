import { useEffect, useState, useRef, type RefObject } from 'react'

export function useResizeObserver<T extends HTMLElement>(
    ref: RefObject<T | null>,
    enabled = true
) {
    const [width, setWidth] = useState(0)
    const [height, setHeight] = useState(0)
    const rafIdRef = useRef<number | null>(null)

    useEffect(() => {
        const element = ref.current
        if (!enabled || !element) return

        const observer = new ResizeObserver((entries) => {
            // Cancel any pending update
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current)
            }
            // Debounce using requestAnimationFrame for smooth 60fps updates
            rafIdRef.current = requestAnimationFrame(() => {
                const { width, height } = entries[0].contentRect
                setWidth(width)
                setHeight(height)
                rafIdRef.current = null
            })
        })
        observer.observe(element)
        return () => {
            observer.disconnect()
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current)
            }
        }
    }, [enabled, ref])
    return { width, height }
}