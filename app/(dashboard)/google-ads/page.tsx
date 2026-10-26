import { Suspense } from "react";
import type { Metadata } from "next";
import { GoogleAdsContent } from "@/components/features/google-ads/GoogleAdsContent";

export const metadata: Metadata = { title: "Google Ads" };

export default function GoogleAdsPage() {
    // useSearchParams (OAuth callback messages) needs a Suspense boundary
    return (
        <Suspense>
            <GoogleAdsContent />
        </Suspense>
    );
}
