var disqus_config = function () {
    this.page.url = 'https://randomperson3465.github.io/animated-map-art';  // Replace PAGE_URL with your page's canonical URL variable
    this.page.identifier = 'https://randomperson3465.github.io/animated-map-art'; // Replace PAGE_IDENTIFIER with your page's unique identifier variable
};

(function () { // DON'T EDIT BELOW THIS LINE
    var d = document, s = d.createElement('script');
    s.src = 'https://randomperson3465.disqus.com/embed.js';
    s.setAttribute('data-timestamp', +new Date());
    (d.head || d.body).appendChild(s);
})();

function removeAds() {
    let disqus = document.getElementById('disqus_thread');

    if (disqus) {
        let remove_ads = setInterval(() => {
            let iframes = document.getElementsByTagName('iframe');

            for (var iframe in iframes) {
                if (typeof iframes[iframe].src === 'undefined') {
                    continue;
                }

                if (iframes[iframe].src.match(/(ads-iframe)|(disqusads)/gi)) {
                    iframes[iframe].style.display = 'none';
                    disqus.style.width = '100%';
                }
            }
        }, 500);

        setTimeout(function () {
            clearInterval(remove_ads);
        }, 5000);
    }
}
// https://stackoverflow.com/a/63260070
// Removes shitty ads
document.addEventListener('DOMContentLoaded', removeAds);
document.addEventListener('themeChanged', removeAds);

document.addEventListener('themeChanged', function (e) {
    if (document.readyState == 'complete') {
        DISQUS.reset({ reload: true, config: disqus_config });
    }
});

document.addEventListener('themeChanged', function (e) {
    DISQUS.reset({ reload: true, config: disqus_config });
});

function setDarkTheme() {
    document.querySelector('html').setAttribute('data-bs-theme', 'dark');
    document.querySelector('.document-theme-changer').innerHTML = '<i class="bi bi-sun" onclick="setLightTheme();"></i>';
    document.body.style.backgroundColor = 'rgb(33, 37, 41)'; // Prevent Disqus desync
    const event = new Event('themeChanged');
    document.dispatchEvent(event);
    localStorage.setItem('documentTheme', '1');
}

function setLightTheme() {
    document.querySelector('html').removeAttribute('data-bs-theme');
    document.querySelector(".document-theme-changer").innerHTML = '<i class="bi bi-moon" onclick="setDarkTheme();"></i>';
    document.body.style.backgroundColor = 'rgb(255, 255, 255)';
    const event = new Event('themeChanged');
    document.dispatchEvent(event);
    localStorage.setItem('documentTheme', '0');
}

if (localStorage.getItem("documentTheme") === '1') {
    setDarkTheme();
}