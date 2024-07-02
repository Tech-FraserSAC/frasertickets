// @ts-ignore
const getElementBySelectorAsync: (selector: string) => Promise<Element> = (selector: string) =>
    new Promise((resolve) => {
        const getElement = () => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
            } else {
                requestAnimationFrame(getElement);
            }
        };
        getElement();
    });

export default getElementBySelectorAsync;
