import Link from "next/link";

export const dynamic = "force-dynamic";

export default function CheckoutSuccessPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-md card p-6 md:p-7">
        <div className="flex flex-col items-center text-center gap-4">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
            Pagamento Confirmado
          </h1>

          <div className="pt-1 w-full">
            <Link className="btn btn-cta w-full" href="/">
              Ok
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
