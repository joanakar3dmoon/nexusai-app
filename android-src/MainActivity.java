package com.r3dm.nexusai;
import androidx.appcompat.app.AppCompatActivity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.view.Window;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.FrameLayout;
import android.graphics.Color;
import android.os.Build;
import android.view.View;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.LoadAdError;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private AdView adView;
    private InterstitialAd mInterstitialAd;
    private boolean adLoading = false;
    private ProgressBar progressBar;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                             WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED);

        // Inicializar AdMob
        MobileAds.initialize(this, initializationStatus -> {});

        // Layout principal
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#0f0f1a"));

        // ProgressBar
        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setLayoutParams(new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 4));
        progressBar.setBackgroundColor(Color.parseColor("#1a1a2e"));
        if (progressBar.getIndeterminateDrawable() != null) {
            progressBar.getIndeterminateDrawable().setColorFilter(
                Color.parseColor("#7c3aed"), android.graphics.PorterDuff.Mode.SRC_IN);
        }
        progressBar.setIndeterminate(true);

        // WebView
        webView = new WebView(this);
        LinearLayout.LayoutParams wvParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f);
        webView.setLayoutParams(wvParams);
        webView.setBackgroundColor(Color.parseColor("#0f0f1a"));

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setGeolocationEnabled(false);
        s.setSaveFormData(false);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            s.setSafeBrowsingEnabled(false);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        // Force dark theme
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            s.setForceDark(WebSettings.FORCE_DARK_ON);
        }

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                progressBar.setVisibility(View.VISIBLE);
            }
            @Override
            public void onPageFinished(WebView view, String url) {
                progressBar.setVisibility(View.GONE);
                view.evaluateJavascript(
                    "document.getElementById('splash-screen')?.remove();" +
                    "document.querySelector('[data-splash]')?.remove();" +
                    "if(document.querySelector('#root')) document.querySelector('#root').style.display='block';" +
                    "document.body.style.display='block';" +
                    "document.body.style.backgroundColor = '#0f0f1a';" +
                    "true;", null);
            }
            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                android.util.Log.e("NexusAI", "Error: " + errorCode + " - " + description + " - " + failingUrl);
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (newProgress < 100) {
                    progressBar.setVisibility(View.VISIBLE);
                } else {
                    progressBar.setVisibility(View.GONE);
                }
            }
        });

        webView.loadUrl("https://nexusai-app-seven.vercel.app");

        // Banner AdMob en la parte inferior
        adView = new AdView(this);
        adView.setAdSize(AdSize.BANNER);
        adView.setAdUnitId("ca-app-pub-4903263409458961/8825147276");
        AdRequest adRequest = new AdRequest.Builder().build();
        adView.loadAd(adRequest);

        loadInterstitial();

        root.addView(progressBar);
        root.addView(webView);
        root.addView(adView);
        setContentView(root);
    }

    private void loadInterstitial() {
        if (adLoading) return;
        adLoading = true;
        AdRequest req = new AdRequest.Builder().build();
        InterstitialAd.load(this, "ca-app-pub-4903263409458961/4622591073", req,
            new InterstitialAdLoadCallback() {
                @Override
                public void onAdLoaded(InterstitialAd ad) {
                    mInterstitialAd = ad;
                    adLoading = false;
                }
                @Override
                public void onAdFailedToLoad(LoadAdError err) {
                    adLoading = false;
                }
            });
    }

    private void showInterstitialIfReady() {
        if (mInterstitialAd != null) {
            mInterstitialAd.show(MainActivity.this);
            mInterstitialAd = null;
            loadInterstitial();
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onPause() { super.onPause(); if (adView != null) adView.pause(); if (webView != null) webView.onPause(); }

    @Override
    protected void onResume() { super.onResume(); if (adView != null) adView.resume(); if (webView != null) webView.onResume(); }

    @Override
    protected void onDestroy() { if (adView != null) adView.destroy(); if (webView != null) webView.destroy(); super.onDestroy(); }
}