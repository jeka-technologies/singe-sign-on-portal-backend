export function autoBind(instance: any) {
    const proto = Object.getPrototypeOf(instance)

    Object.getOwnPropertyNames(proto).forEach((key) => {
        const val = proto[key]
        if (key !== 'constructor' && typeof val === 'function') {
            instance[key] = val.bind(instance)
        }
    })
}
