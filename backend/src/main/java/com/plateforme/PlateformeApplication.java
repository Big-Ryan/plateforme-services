package com.plateforme;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class PlateformeApplication {

    public static void main(String[] args) {
        SpringApplication.run(PlateformeApplication.class, args);
    }
}
