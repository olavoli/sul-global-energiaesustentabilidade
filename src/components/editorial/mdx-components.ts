import { Callout, Figure, KeyPoints, Quote } from "./MdxComponents";
import type { EditorialMdxComponents } from "@/content/types";
import { YouTubeEmbed } from "./YouTubeEmbed";
import { VideoCard } from "./VideoCard";
import {
  EditorialTable,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
  Emphasis,
  Strong,
  Superscript,
  Subscript,
  Underline,
} from "./EditorialTable";

export const editorialMdxComponents = {
  Callout,
  Quote,
  Figure,
  KeyPoints,
  EditorialTable,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
  Emphasis,
  Strong,
  Superscript,
  Subscript,
  Underline,
  YouTubeEmbed,
  VideoCard,
} satisfies EditorialMdxComponents;
