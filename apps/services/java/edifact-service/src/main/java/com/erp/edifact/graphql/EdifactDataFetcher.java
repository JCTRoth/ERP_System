package com.erp.edifact.graphql;

import com.erp.edifact.entity.EdifactMessage;
import com.erp.edifact.service.EdifactService;
import com.netflix.graphql.dgs.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@DgsComponent
@RequiredArgsConstructor
public class EdifactDataFetcher {
    
    private final EdifactService edifactService;
    
    @DgsQuery
    public EdifactMessage edifactMessage(@InputArgument String id) {
        return edifactService.findById(UUID.fromString(id)).orElse(null);
    }
    
    @DgsQuery
    public List<EdifactMessage> edifactMessages(
            @InputArgument String companyId,
            @InputArgument String messageType,
            @InputArgument Integer page,
            @InputArgument Integer size
    ) {
        PageRequest pageable = PageRequest.of(
                page != null ? page : 0,
                size != null ? size : 20,
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        
        if (messageType != null && !messageType.isBlank()) {
            return edifactService.findByCompanyAndType(UUID.fromString(companyId), messageType, pageable).getContent();
        }
        return edifactService.findByCompany(UUID.fromString(companyId), pageable).getContent();
    }
    
    @DgsMutation
    public EdifactMessage generateEdifact(@InputArgument Map<String, Object> input) throws Exception {
        return edifactService.generateOutbound(
                UUID.fromString((String) input.get("companyId")),
                (String) input.get("messageType"),
                (Map<String, Object>) input.get("data"),
                input.get("createdBy") != null ? UUID.fromString((String) input.get("createdBy")) : null
        );
    }
}
