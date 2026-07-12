// src/lib/admob.ts
// Servicio AdMob completo para NexusAI
// App ID: ca-app-pub-4903263409458961~5751005760

import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, AdOptions, RewardAdOptions } from '@capacitor-community/admob';

const AD_IDS = {
  banner:               'ca-app-pub-4903263409458961/4190512089',
  interstitial:         'ca-app-pub-4903263409458961/2805278221',
  rewardedInterstitial: 'ca-app-pub-4903263409458961/4643571132',
  rewarded:             'ca-app-pub-4903263409458961/7673059155',
  nativeAdvanced:       'ca-app-pub-4903263409458961/9059695386',
  appOpen:              'ca-app-pub-4903263409458961/6433532040',
};

export async function initAdMob() {
  await AdMob.initialize({
    requestTrackingAuthorization: true,
    initializeForTesting: false,
  });
}

export async function showBanner() {
  const options: BannerAdOptions = {
    adId: AD_IDS.banner,
    adSize: BannerAdSize.ADAPTIVE_BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    margin: 0,
    isTesting: false,
  };
  await AdMob.showBanner(options);
}

export async function hideBanner() {
  await AdMob.hideBanner();
}

export async function showInterstitial() {
  const options: AdOptions = { adId: AD_IDS.interstitial };
  await AdMob.prepareInterstitial(options);
  await AdMob.showInterstitial();
}

export async function showRewarded(): Promise<boolean> {
  const options: RewardAdOptions = { adId: AD_IDS.rewarded };
  await AdMob.prepareRewardVideoAd(options);
  const result = await AdMob.showRewardVideoAd();
  return !!result?.value;
}

export async function showRewardedInterstitial() {
  const options: AdOptions = { adId: AD_IDS.rewardedInterstitial };
  await AdMob.prepareRewardInterstitialAd(options);
  await AdMob.showRewardInterstitialAd();
}

export async function showAppOpen() {
  const options: AdOptions = { adId: AD_IDS.appOpen };
  await AdMob.prepareAppOpenAd(options);
  await AdMob.showAppOpenAd();
}
