"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Textarea } from "@/src/components/ui/textarea";
import { useToast } from "@/src/hooks/use-toast";
import { Sparkles } from "lucide-react";
import { useMask } from "@react-input/mask";
import { z } from "zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { logEvent } from "@/src/lib/analytics";
import { useTranslations } from "next-intl";

interface RequestFormProps {
  selectedPrice?: { code: string; name: string };
}

const makeSchema = (t: ReturnType<typeof useTranslations>) =>
  z.object({
    name: z.string().min(1, { message: t("zod.required") }),
    email: z
      .string()
      .min(1, { message: t("zod.required") })
      .email({ message: t("zod.email_invalid") }),
    phone: z
      .string()
      .min(1, { message: t("zod.required") })
      .regex(/^\+?[0-9\s\-()]{15,}$/, { message: t("zod.phone_invalid") }),
    businessWebsite: z
      .string()
      .regex(
        /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/,
        { message: t("zod.website_invalid") }
      )
      .optional()
      .or(z.literal("")),
    message: z
      .string()
      .min(1, { message: t("zod.required") })
      .max(500, { message: t("zod.message_too_long") }),
  });

const RequestForm = ({ selectedPrice }: RequestFormProps) => {
  const t = useTranslations("home.requestForm");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const inputRef = useMask({
    mask: "(__) _____-____",
    replacement: { _: /\d/ },
  });

  const formSchema = useMemo(() => makeSchema(t), [t]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      businessWebsite: "",
      message: "",
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/request-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      toast({
        title: t("toast.success_title"),
        description: t("toast.success_desc"),
      });

      form.reset();
      logEvent({
        action: "form_submit",
        category: "request_form",
        label: "Request form - Success",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("toast.error_fallback");
      toast({
        variant: "destructive",
        title: t("toast.error_title"),
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-16 md:py-24" id="request-form">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <Sparkles size={16} />
              <span className="text-sm font-medium">{t("badge")}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t("title")}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("subtitle")}
            </p>
          </div>

          <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 md:p-8 border">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("labels.name")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder=""
                              className="text-md"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("labels.email")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t("placeholders.email")}
                              className="text-md"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("labels.phone")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t("placeholders.phone")}
                              className="text-md"
                              {...field}
                              ref={inputRef}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="businessWebsite"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("labels.businessWebsite")}</FormLabel>
                          <FormControl>
                            <Input
                              className="text-md"
                              {...field}
                              placeholder={t("placeholders.website")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("labels.message")}</FormLabel>
                        <FormControl>
                          <Textarea
                            className="text-md"
                            {...field}
                            placeholder={t("placeholders.message")}
                            rows={6}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full md:w-6/12 rounded-full px-6 py-3 h-auto text-sm"
                  disabled={isSubmitting}
                  onClick={() =>
                    logEvent({
                      action: "cta_submit",
                      category: "request_form",
                      label: "Request form - Click",
                    })
                  }
                >
                  {isSubmitting ? t("cta.submitting") : t("cta.submit")}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RequestForm;
