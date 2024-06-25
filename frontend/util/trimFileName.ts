export default function trimFileName(fname: string, maxLength: number) {
    const fileExt = fname.substring(fname.lastIndexOf("."));
    const fnameWithoutExt = fname.substring(0, fname.lastIndexOf("."));

    const trimArea = fnameWithoutExt.length > maxLength ? "[...]" : "";

    return fnameWithoutExt.substring(0, maxLength) + trimArea + fileExt;
}