import type { MetadataRoute } from "next";
const baseUrl="https://refifoundation.vercel.app";
export default function sitemap():MetadataRoute.Sitemap{const now=new Date();return[
{url:baseUrl,lastModified:now,changeFrequency:"weekly",priority:1},
{url:baseUrl+"/about",lastModified:now,changeFrequency:"monthly",priority:.8},
{url:baseUrl+"/our-work",lastModified:now,changeFrequency:"monthly",priority:.9},
{url:baseUrl+"/impact",lastModified:now,changeFrequency:"monthly",priority:.8},
{url:baseUrl+"/stories",lastModified:now,changeFrequency:"weekly",priority:.8},
{url:baseUrl+"/get-involved",lastModified:now,changeFrequency:"monthly",priority:.9},
{url:baseUrl+"/play",lastModified:now,changeFrequency:"weekly",priority:.9},
{url:baseUrl+"/fundraise",lastModified:now,changeFrequency:"weekly",priority:.8},
{url:baseUrl+"/leaderboard",lastModified:now,changeFrequency:"daily",priority:.7},
{url:baseUrl+"/donate",lastModified:now,changeFrequency:"weekly",priority:1}];}