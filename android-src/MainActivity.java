package com.r3dm.nexusai;
import android.app.Activity;
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
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.initialization.InitializationStatus;
import com.google.android.gms.ads.initialization.OnInitializationCompleteListener;

public class MainActivity extends Activity {
    private WebView webView;
    private AdView adView;
    private ProgressBar progressBar;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED);

        // Inicializar AdMob
        MobileAds.initialize(this, new OnInitializationCompleteListener() {
            @Override
            public void onInitializationComplete(InitializationStatus initializationStatus) {}
        });

        // Layout principal
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setBackgroundColor(Color.parseColor("#080b14"));

        // ProgressBar (arriba)
        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setLayoutParams(new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 6));
        progressBar.setBackgroundColor(Color.parseColor("#1a1a2e"));
        progressBar.setProgressDrawable(getResources().getDrawable(android.R.drawable.progress_horizontal));
        progressBar.setVisibility(ProgressBar.GONE);

        // WebView
        webView = new WebView(this);
        LinearLayout.LayoutParams wvParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f);
        webView.setLayoutParams(wvParams);
        webView.setBackgroundColor(Color.parseColor("#080b14"));

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setDatabaseEnabled(true);
        s.setAppCacheEnabled(true);

        // WebViewClient para cargar URLs dentro del WebView
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                progressBar.setVisibility(ProgressBar.GONE);
            }
        });

        // WebChromeClient para progreso de carga
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (newProgress < 100) {
                    progressBar.setVisibility(ProgressBar.VISIBLE);
                    progressBar.setProgress(newProgress);
                } else {
                    progressBar.setVisibility(ProgressBar.GONE);
                }
            }
        });

        // Cargar la URL
        webView.loadUrl("https://nexusai-app-seven.vercel.app");

        // Banner AdMob en la parte inferior
        adView = new AdView(this);
        adView.setAdSize(AdSize.BANNER);
        adView.setAdUnitId("ca-app-pub-4903263409458961/8825147276");
        AdRequest adRequest = new AdRequest.Builder().build();
        adView.loadAd(adRequest);

        layout.addView(progressBar);
        layout.addView(webView);
        layout.addView(adView);
        setContentView(layout);
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