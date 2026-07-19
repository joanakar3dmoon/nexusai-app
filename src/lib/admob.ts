// AdMob helper — NexusAI
// Detecta si corre en Capacitor (APK) o web y actúa en consecuencia

const IS_NATIVE = typeof (window as any).Capacitor !== "undefined" && 
                  (window as any).Capacitor?.isNativePlatform?.();

const IDS = {
  banner:      "ca-app-pub-4903263409458961/8825147276",
  interstitial:"ca-app-pub-4903263409458961/4622591073",
  reward:      "ca-app-pub-4903263409458961/3980014703",
};

let admobPlugin: any = null;

async function getAdMob() {
  if (admobPlugin) return admobPlugin;
  if (!IS_NATIVE) return null;
  try {
    const { AdMob } = await import("@capacitor-community/admob");
    await AdMob.initialize({ requestTrackingAuthorization: false });
    admobPlugin = AdMob;
    return AdMob;
  } catch { return null; }
}

/** Muestra banner en la parte inferior */
export async function showBanner() {
  const AdMob = await getAdMob();
  if (!AdMob) return; // en web no hay SDK nativo
  try {
    await AdMob.showBanner({
      adId: IDS.banner,
      adSize: "BANNER",
      position: "BOTTOM_CENTER",
      margin: 0,
      isTesting: false,
    });
  } catch (e) { console.warn("AdMob banner:", e); }
}

/** Oculta el banner */
export async function hideBanner() {
  const AdMob = await getAdMob();
  if (!AdMob) return;
  try { await AdMob.hideBanner(); } catch {}
}

/** Precarga y muestra intersticial */
export async function showInterstitial() {
  const AdMob = await getAdMob();
  if (!AdMob) return;
  try {
    await AdMob.prepareInterstitial({ adId: IDS.interstitial, isTesting: false });
    await AdMob.showInterstitial();
  } catch (e) { console.warn("AdMob interstitial:", e); }
}

/** Precarga y muestra anuncio con recompensa */
export async function showRewarded(): Promise<boolean> {
  const AdMob = await getAdMob();
  if (!AdMob) return false;
  try {
    await AdMob.prepareRewardVideoAd({ adId: IDS.reward, isTesting: false });
    const result = await AdMob.showRewardVideoAd();
    return !!result?.reward;
  } catch (e) { console.warn("AdMob reward:", e); return false; }
}
