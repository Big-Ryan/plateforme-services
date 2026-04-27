package com.plateforme.subscription.service;

import com.plateforme.subscription.entity.SubscriptionPlan;
import com.plateforme.users.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import jakarta.mail.internet.MimeMessage;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionNotificationService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    @Value("${app.mail-from}")
    private String mailFrom;

    @Value("${app.mail-from-name}")
    private String mailFromName;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Async
    public void sendSubscriptionActivated(User provider, SubscriptionPlan plan,
                                          LocalDate startDate, LocalDate endDate) {
        try {
            Context ctx = new Context();
            ctx.setVariable("firstName", provider.getFirstName());
            ctx.setVariable("planName", plan.getName());
            ctx.setVariable("startDate", startDate.format(DATE_FMT));
            ctx.setVariable("endDate", endDate != null ? endDate.format(DATE_FMT) : "—");
            ctx.setVariable("maxServices", plan.getMaxServices());
            ctx.setVariable("dashboardUrl", frontendUrl + "/provider/dashboard");
            sendEmail(provider.getEmail(), "Votre abonnement est actif !", "email/subscription-activated", ctx);
        } catch (Exception e) {
            log.error("Erreur envoi email activation abonnement à {}", provider.getEmail(), e);
        }
    }

    @Async
    public void sendExpiryReminder(User provider, SubscriptionPlan plan, LocalDate endDate) {
        try {
            long daysRemaining = LocalDate.now().until(endDate).getDays();
            Context ctx = new Context();
            ctx.setVariable("firstName", provider.getFirstName());
            ctx.setVariable("planName", plan.getName());
            ctx.setVariable("endDate", endDate.format(DATE_FMT));
            ctx.setVariable("daysRemaining", daysRemaining);
            ctx.setVariable("renewUrl", frontendUrl + "/provider/subscription");
            sendEmail(provider.getEmail(),
                    "Votre abonnement expire dans " + daysRemaining + " jour(s)",
                    "email/subscription-expiring", ctx);
        } catch (Exception e) {
            log.error("Erreur envoi rappel expiration à {}", provider.getEmail(), e);
        }
    }

    @Async
    public void sendSubscriptionExpired(User provider, SubscriptionPlan plan) {
        try {
            Context ctx = new Context();
            ctx.setVariable("firstName", provider.getFirstName());
            ctx.setVariable("planName", plan.getName());
            ctx.setVariable("renewUrl", frontendUrl + "/provider/subscription");
            sendEmail(provider.getEmail(), "Votre abonnement a expiré", "email/subscription-expiring", ctx);
        } catch (Exception e) {
            log.error("Erreur envoi email expiration à {}", provider.getEmail(), e);
        }
    }

    @Async
    public void sendTrialExpired(User provider, SubscriptionPlan plan) {
        try {
            Context ctx = new Context();
            ctx.setVariable("firstName", provider.getFirstName());
            ctx.setVariable("planName", plan.getName() + " (essai)");
            ctx.setVariable("daysRemaining", 0);
            ctx.setVariable("endDate", LocalDate.now().format(DATE_FMT));
            ctx.setVariable("renewUrl", frontendUrl + "/provider/subscription");
            sendEmail(provider.getEmail(), "Votre période d'essai a expiré", "email/subscription-expiring", ctx);
        } catch (Exception e) {
            log.error("Erreur envoi email essai expiré à {}", provider.getEmail(), e);
        }
    }

    private void sendEmail(String to, String subject, String template, Context ctx) {
        try {
            String html = templateEngine.process(template, ctx);
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(mailFrom, mailFromName);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            log.error("Échec envoi email '{}' à {} : {}", subject, to, e.getMessage());
        }
    }
}
