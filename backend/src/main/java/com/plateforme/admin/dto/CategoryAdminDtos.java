package com.plateforme.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.UUID;

public class CategoryAdminDtos {

    @Getter
    @Builder
    public static class CategoryResponse {
        private UUID    id;
        private String  name;
        private String  slug;
        private Integer sortOrder;
        private boolean active;
        private long    serviceCount;
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateCategoryRequest {
        @NotBlank(message = "Le nom est obligatoire")
        @Size(max = 100)
        private String name;

        @NotBlank(message = "Le slug est obligatoire")
        @Size(max = 100)
        private String slug;

        @NotNull(message = "L'ordre est obligatoire")
        private Integer sortOrder;
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateCategoryRequest {
        @Size(max = 100)
        private String  name;
        private Integer sortOrder;
        private Boolean active;
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReorderRequest {
        @NotNull
        private java.util.List<ReorderItem> items;

        @Getter
        @NoArgsConstructor
        @AllArgsConstructor
        public static class ReorderItem {
            private UUID    id;
            private Integer sortOrder;
        }
    }
}