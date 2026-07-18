export default function () {
    const copyButtons = document.querySelectorAll<HTMLElement>('[copy]');
    for (const button of copyButtons) {
        button.onclick = () => {
            const elem = document.getElementById(button.getAttribute('copy')!);
            if (elem) {
                const isInput = (elem instanceof HTMLInputElement) || (elem instanceof HTMLTextAreaElement);
                const text = isInput ? elem.value : elem.innerText;
                const blob = new Blob([text], { type: 'text/plain' });
                const clipboardItem = new ClipboardItem({ 'text/plain': blob });
                navigator.clipboard.write([clipboardItem])
                .then(() => alert("Copied!"));
            }
        }
    }
}