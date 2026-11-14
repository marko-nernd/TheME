import { complimentaryPlaces } from "@/lib/complimentary-event-places";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) { return complimentaryPlaces(request, (await params).id, false); }
export async function POST(request: Request, { params }: Context) { return complimentaryPlaces(request, (await params).id, false); }
