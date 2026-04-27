package com.erp.company.repository;

import com.erp.company.entity.GroupPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface GroupPermissionRepository extends JpaRepository<GroupPermission, UUID> {

    List<GroupPermission> findByGroupId(UUID groupId);

    List<GroupPermission> findByGroupIdIn(Collection<UUID> groupIds);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("DELETE FROM GroupPermission gp WHERE gp.group.id = :groupId")
    void deleteByGroupId(UUID groupId);
}
