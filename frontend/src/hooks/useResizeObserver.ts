import { useEffect, useState, type RefObject } from 'react'

export function useResizeObserver<T extends HTMLElement>(
    ref: RefObject<T | null>,
    enabled = true
) {
    const [width, setWidth] = useState(0)
    const [height, setHeight] = useState(0)

    useEffect(() => {
        if (!enabled || !ref.current) return

        const observer = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect
            setWidth(width)
            setHeight(height)
        })

        observer.observe(ref.current)
        return () => observer.disconnect()
    }, [ref, enabled])

    return { width, height }
}