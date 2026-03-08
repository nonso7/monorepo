"use client"


import { AlertCircle } from "lucide-react";
import { Button } from "./ui/button"


interface FrozenAccountBannerProps {
    freezeReason?: string | null;
    deficit: number
    onClose: () => void;
}

export default function FrozenAccountBanner({ freezeReason, deficit, onClose }: FrozenAccountBannerProps) {



    function formatNgn(amount: number) {
        return new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            minimumFractionDigits: 0,
        }).format(amount);
    }

    return (
        <div className={`w-full bg-white/20 backdrop-blur-3xl fixed inset-0 flex items-center justify-center  px-[4%] py-4  ${freezeReason ? "scale-100" : "scale-0"} transition-all duration-150 ease-in-out `} >

            <div className="w-full max-w-5xl flex items-center justify-center flex-col py-4 px-2 gap-1 bg-white shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] border-3 border-foreground  " >
                <AlertCircle className="mt-1 h-8 w-8 shrink-0 text-red-600" />
                <p className="text-xl font-bold md:text-2xl text-red-700  ">Account frozen</p>
                <p className="text-base  font-semibold mb-4 ">A payment reversal caused a negative balance. Please top up to continue using staking and withdrawals.</p>


                {freezeReason ? (
                    <p className="  text-xs md:text-sm text-muted-foreground "><b>Reason:</b> {freezeReason}</p>
                ) : null}


                {deficit > 0 && (
                    <p className="  text-xs md:text-sm text-muted-foreground">
                        <b>Outstanding deficit:</b> {formatNgn(deficit)}
                    </p>
                )}


                <Button
                onClick={onClose}
                className="mt-6 cursor-pointer  border-3 border-foreground bg-primary font-bold shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-foreground">
                    Top up wallet
                </Button>
            </div>

        </div>
    )
}