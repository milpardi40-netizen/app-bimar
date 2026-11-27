import React, { useEffect, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

// Browsers expose the install prompt only when their own installability criteria are met.
export default function InstallApp() {
  const [installEvent, setInstallEvent] = useState(null);
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(() =>
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  useEffect(() => {
    const onPrompt = event => { event.preventDefault(); setInstallEvent(event); };
    const onInstalled = () => { setInstalled(true); setInstallEvent(null); setOpen(false); };
    const displayMode = window.matchMedia('(display-mode: standalone)');
    const onDisplayChange = event => setInstalled(event.matches || window.navigator.standalone === true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    displayMode.addEventListener?.('change', onDisplayChange);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      displayMode.removeEventListener?.('change', onDisplayChange);
    };
  }, []);

  async function install() {
    if (!installEvent) return;
    const prompt = installEvent;
    setInstallEvent(null);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'accepted') setOpen(false);
    } catch {
      // The manual browser instructions remain available in the dialog.
    }
  }

  if (installed || /HamrahSalamatAndroid/.test(navigator.userAgent)) return null;
  return <>
    <button className="install-button" onClick={() => setOpen(true)}><Download size={17}/><span>نصب برنامه</span></button>
    {open && <div className="modal-backdrop" onMouseDown={() => setOpen(false)}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="install-title" onMouseDown={e => e.stopPropagation()}>
        <button className="modal-close" onClick={() => setOpen(false)} aria-label="بستن"><X size={20}/></button>
        <div className="modal-icon"><Smartphone size={22}/></div>
        <h2 id="install-title">نصب همراه سلامت</h2>
        <p>برنامه را به صفحه اصلی دستگاه اضافه کنید تا مانند یک اپلیکیشن باز شود.</p>
        {installEvent && <button className="primary-button install-confirm" onClick={install}><Download size={18}/> نصب برنامه</button>}
        <div className="install-steps">
          {isIOS ? <><strong>در آیفون یا آیپد</strong><p>این صفحه را در Safari باز کنید. دکمه اشتراک‌گذاری (Share) را بزنید، سپس «Add to Home Screen» و «Add» را انتخاب کنید.</p></> : <><strong>در اندروید یا رایانه</strong><p>اگر دکمه نصب بالا نمایش داده نمی‌شود، از منوی مرورگر Chrome گزینه «Install app» یا «Add to Home screen» را انتخاب کنید. نام گزینه ممکن است در مرورگرهای دیگر متفاوت باشد.</p></>}
        </div>
        <div className="modal-notice">نصب به آدرس HTTPS و مرورگر سازگار نیاز دارد. پس از اولین بارگذاری، بخش‌های ذخیره‌شده برنامه بدون اینترنت نیز باز می‌شوند. اطلاعات همچنان فقط در همین دستگاه می‌مانند؛ نصب برنامه یادآوری پس‌زمینه را فعال نمی‌کند.</div>
      </div>
    </div>}
  </>;
}
