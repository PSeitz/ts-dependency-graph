export function convertPath(el: string) {
    return {
        orig_path: el,
        normalized_path: toPosixPath(el),
    }
}

export function toPosixPath(windowsPath: string) {
    return windowsPath
        .replace(/^\\\\\?\\/, '')
        .replace(/\\/g, '/')
        .replace(/\/\/+/g, '/')
}
